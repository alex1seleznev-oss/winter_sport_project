import {ImageResponse} from 'next/og';
export const alt='Winter Sports Hub — биатлон и лыжные гонки';
export const size={width:1200,height:630};
export const contentType='image/png';
export default function Image(){return new ImageResponse(<div style={{width:'100%',height:'100%',background:'#081420',color:'#eef7ff',display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'70px 76px',fontFamily:'sans-serif'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:24,color:'#a6cbe5'}}><span>WINTER SPORTS HUB</span><span>2026 / 27</span></div><div style={{display:'flex',flexDirection:'column',fontSize:82,lineHeight:1.05,fontWeight:700,letterSpacing:-3}}><span>Весь сезон.</span><span style={{color:'#acd9fa'}}>В вашем ритме.</span></div><div style={{display:'flex',fontSize:28,borderTop:'1px solid #3c5970',paddingTop:24,color:'#c5d9e8'}}>Биатлон · Лыжные гонки · Календарь · Истории</div></div>,size)}
