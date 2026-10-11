import {editorialBlocks,inlineParts} from '../../lib/editorial-content.mjs';import styles from './Editorial.module.css';
import {Fragment} from 'react';
import {ArticlePhotograph} from './ArticlePhotograph';
import {StudyFigure} from './StudyFigure';
import type {ArticleIllustration} from '../../lib/article-photographs';
function Inline({value,sources}:{value:string;sources:string[]}){return <>{inlineParts(value).map((p,i)=>p.kind==='source'?<sup key={i}><a href={'#source-'+p.id} aria-label={`Источник ${sources.indexOf(p.id!)+1}`}>[{sources.indexOf(p.id!)+1}]</a></sup>:p.kind==='strong'?<strong key={i}>{p.text}</strong>:p.text)}</>}
export function ArticleBody({body,sources,illustrations=[],graphic}:{body:string;sources:string[];illustrations?:ArticleIllustration[];graphic?:string}){let heading=0;return <div className={styles.body}>{editorialBlocks(body).map((b,i)=>{if(b.kind==='heading'){heading++;return <Fragment key={i}>{heading===2&&graphic?<StudyFigure kind={graphic}/>:null}{illustrations.filter(slot=>slot.beforeHeading===heading).map(slot=><ArticlePhotograph key={slot.photo.key} photo={slot.photo}/>)}{b.level===3?<h3 id={b.id}>{b.text}</h3>:<h2 id={b.id}>{b.text}</h2>}</Fragment>}return <p key={i}><Inline value={b.text} sources={sources}/></p>})}</div>}
