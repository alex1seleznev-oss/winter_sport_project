'use client';
import {useEffect,useRef} from 'react';
export function ReadingContents({children,className,breakpoint=801}:{children:React.ReactNode;className:string;breakpoint?:number}){
 const root=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const query=window.matchMedia(`(min-width: ${breakpoint}px)`),update=()=>{if(root.current)root.current.open=query.matches};update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[breakpoint]);
 return <details ref={root} className={className}><summary>В этом материале</summary>{children}</details>;
}
