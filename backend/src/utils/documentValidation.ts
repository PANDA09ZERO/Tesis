import fs from 'fs/promises';
import yauzl from 'yauzl';
import { SaxesParser } from 'saxes';

function validXml(xml: string, contentTypes: boolean) {
  let valid=true,root=false,mainPart=false;
  const parser=new SaxesParser({xmlns:true});
  parser.on('error',()=>{valid=false;});parser.on('doctype',()=>{valid=false;});
  parser.on('opentag',tag=>{
    if(!root){root=true;
      valid=valid&&(contentTypes ? tag.local==='Types'&&tag.uri==='http://schemas.openxmlformats.org/package/2006/content-types'
        : tag.local==='document'&&['http://schemas.openxmlformats.org/wordprocessingml/2006/main','http://purl.oclc.org/ooxml/wordprocessingml/main'].includes(tag.uri));
    }
    if(contentTypes&&tag.local==='Override'&&tag.attributes.PartName?.value==='/word/document.xml'&&tag.attributes.ContentType?.value==='application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml')mainPart=true;
  });
  try{parser.write(xml).close();}catch{return false;}
  return valid&&root&&(!contentTypes||mainPart);
}

// Se procesa el ZIP secuencialmente y nunca se extrae al disco.
export function validDocx(filename: string): Promise<boolean> {
  return new Promise(resolve => {
    yauzl.open(filename, {lazyEntries:true, validateEntrySizes:true}, (error, zip) => {
      if (error || !zip) return resolve(false);
      let finished=false, entries=0, total=0;
      const seen=new Set<string>(), required=new Set<string>();
      const timer=setTimeout(()=>finish(false),5000);
      function finish(valid: boolean) {if(finished)return;finished=true;clearTimeout(timer);zip!.close();resolve(valid);}
      zip.on('error',()=>finish(false));
      zip.on('end',()=>finish(required.size===2));
      zip.on('entry',entry=>{
        const name=entry.fileName;
        total+=entry.uncompressedSize;
        if (++entries>2000 || total>100*1024*1024 || entry.uncompressedSize>25*1024*1024 ||
          entry.uncompressedSize>Math.max(1024*1024,entry.compressedSize*100) ||
          entry.generalPurposeBitFlag&1 || seen.has(name) || name.includes('\\') || name.startsWith('/') ||
          name.split('/').includes('..') || ((entry.externalFileAttributes>>>16)&0xf000)===0xa000) return finish(false);
        seen.add(name);
        if(name.endsWith('/'))return zip.readEntry();
        zip.openReadStream(entry,(streamError,stream)=>{
          if(streamError||!stream)return finish(false);
          let bytes=0;const chunks:Buffer[]=[];
          const inspect=name==='[Content_Types].xml'||name==='word/document.xml';
          stream.on('error',()=>finish(false));
          stream.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(inspect&&bytes<=2*1024*1024)chunks.push(chunk);if(bytes>25*1024*1024||(inspect&&bytes>2*1024*1024)){stream.destroy();finish(false);}});
          stream.on('end',()=>{
            if(finished)return;
            if(inspect){const xml=Buffer.concat(chunks).toString('utf8');
              if(/<!DOCTYPE|<!ENTITY/i.test(xml))return finish(false);
              const valid=validXml(xml,name==='[Content_Types].xml');
              if(!valid)return finish(false);required.add(name);
            }
            zip.readEntry();
          });
        });
      });
      zip.readEntry();
    });
  });
}

export async function hasExpectedSignature(filename: string, extension: string): Promise<boolean> {
  if(extension==='.docx')return validDocx(filename);
  const file=await fs.open(filename,'r');
  try {
    const header=Buffer.alloc(8);const {bytesRead}=await file.read(header,0,8,0);const h=header.subarray(0,bytesRead);
    switch(extension){
      case '.pdf':return h.subarray(0,5).toString()==='%PDF-';
      case '.jpg':case '.jpeg':return h[0]===255&&h[1]===216&&h[2]===255;
      case '.png':return h.equals(Buffer.from([137,80,78,71,13,10,26,10]));
      case '.gif':return ['GIF87a','GIF89a'].includes(h.subarray(0,6).toString());
      case '.doc':return h.equals(Buffer.from([208,207,17,224,161,177,26,225]));
      default:return false;
    }
  }finally{await file.close();}
}
