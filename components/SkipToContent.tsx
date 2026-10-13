'use client';
export function SkipToContent(){
 return <a className="skipLink" href="#main-content" onClick={event=>{
  const target=document.querySelector<HTMLElement>('main h1')||document.getElementById('main-content');
  if(target){event.preventDefault();window.history.replaceState(window.history.state,'','#main-content');target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});}
 }}>Перейти к содержанию</a>;
}
