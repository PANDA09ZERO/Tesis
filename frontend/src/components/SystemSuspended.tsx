import {useEffect,useState} from 'react';
import {useAuth} from '../context/AuthContext';
export default function SystemSuspended(){
 const [suspended,setSuspended]=useState(false);const {logout,user}=useAuth();
 useEffect(()=>{const show=()=>setSuspended(true);window.addEventListener('system:suspended',show);return()=>window.removeEventListener('system:suspended',show);},[]);
 if(!suspended||user?.rolSistema==='superadministrador')return null;
 return <div className="app-surface dark:bg-gray-950 fixed inset-0 z-50 flex items-center justify-center bg-gray-100 p-4" role="alert"><section className="card max-w-lg space-y-4"><h1 className="text-xl font-semibold">Servicio suspendido temporalmente</h1><p>Tus datos se conservan. Intenta ingresar más tarde.</p><div className="flex flex-wrap gap-3"><button className="btn-primary" onClick={()=>window.location.reload()}>Volver a intentar</button><button className="btn-secondary" onClick={()=>{setSuspended(false);logout();}}>Cerrar sesión</button></div></section></div>;
}
