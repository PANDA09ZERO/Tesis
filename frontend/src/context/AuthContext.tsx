import {createContext,useContext,useState,useEffect,useRef,ReactNode} from 'react';
import {authApi} from '../api/endpoints';
import type {User,AuthState} from '../types';
import toast from 'react-hot-toast';
interface AuthContextType extends AuthState {login:(email:string,password:string)=>Promise<void>;logout:()=>void;refreshProfile:()=>Promise<void>}
const AuthContext=createContext<AuthContextType|undefined>(undefined);
const empty:AuthState={user:null,token:null,isAuthenticated:false,isLoading:false};
export function AuthProvider({children}:{children:ReactNode}) {
 const [state,setState]=useState<AuthState>({...empty,isLoading:true});
 const [sessionError,setSessionError]=useState(''); const generation=useRef(0);
 const logout=()=>{generation.current++;localStorage.removeItem('token');localStorage.removeItem('user');setSessionError('');setState(empty);};
 const validUser=(u:any):u is User=>!!u&&Number.isSafeInteger(u.id)&&u.id>0&&typeof u.nombre==='string'&&typeof u.apellido==='string'&&typeof u.email==='string'&&['administrador','profesor','alumno','apoderado','superadministrador'].includes(u.rol)&&(u.debe_cambiar_password===undefined||typeof u.debe_cambiar_password==='boolean');
 const normalize=(u:User):User=>u.rol==='superadministrador'?{...u,rol:'administrador',rolSistema:'superadministrador'}:u;
 const refreshProfile=async()=>{
  const current=++generation.current; const token=localStorage.getItem('token');
  // La caché de usuario nunca concede acceso; el perfil se recupera del servidor.
  localStorage.removeItem('user');setSessionError('');setState({...empty,isLoading:!!token});
  if(!token)return;
  try {const response=await authApi.getProfile();if(current!==generation.current)return;const raw=response.data.data;if(!validUser(raw))throw new Error('Perfil inválido');const user=normalize(raw);localStorage.setItem('user',JSON.stringify(user));setState({user,token,isAuthenticated:true,isLoading:false});}
  catch(error:any){if(current!==generation.current)return;if(error.response?.status===401){logout();return;}setState(empty);setSessionError(error.response?.data?.message||'No se pudo verificar la sesión. Puedes reintentar.');}
 };
 useEffect(()=>{void refreshProfile();const invalid=()=>logout();const changed=(e:StorageEvent)=>{if(e.key==='token')void refreshProfile();};window.addEventListener('auth:invalid',invalid);window.addEventListener('storage',changed);return()=>{generation.current++;window.removeEventListener('auth:invalid',invalid);window.removeEventListener('storage',changed);};},[]);
 const login=async(email:string,password:string)=>{try{const response=await authApi.login(email,password);const result=response.data.data;if(!result||typeof result.token!=='string'||!validUser(result.user))throw new Error('Respuesta de sesión inválida');result.user=normalize(result.user);generation.current++;localStorage.setItem('token',result.token);localStorage.setItem('user',JSON.stringify(result.user));setSessionError('');setState({user:result.user,token:result.token,isAuthenticated:true,isLoading:false});toast.success(`Bienvenido, ${result.user.nombre}`);}catch(error:any){toast.error(error.response?.data?.message||'Error al iniciar sesión');throw error;}};
 return <AuthContext.Provider value={{...state,login,logout,refreshProfile}}>{sessionError?<main className="app-surface min-h-screen flex items-center justify-center p-4"><div className="card max-w-lg" role="alert"><p>{sessionError}</p><div className="flex flex-wrap gap-3 mt-4"><button className="btn-primary" onClick={()=>void refreshProfile()}>Reintentar</button><button className="btn-secondary" onClick={logout}>Cerrar sesión</button></div></div></main>:children}</AuthContext.Provider>;
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('useAuth debe usarse dentro de AuthProvider');return value;}
