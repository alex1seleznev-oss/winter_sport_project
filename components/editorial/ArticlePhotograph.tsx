import type {ArticlePhotograph as Photograph} from '../../lib/article-photographs';
import styles from './ArticlePhotograph.module.css';

export function ArticlePhotograph({photo,cover=false}:{photo:Photograph;cover?:boolean}){
  const image=photo.variants.find(v=>v.width===1280)||photo.variants[photo.variants.length-1];
  return <figure className={`${styles.photo} ${cover?styles.cover:''}`} data-article-photo={photo.key} data-photo-position={cover?'cover':'inline'}>
    <a className={styles.imageLink} href={image.src} target="_blank" rel="noopener noreferrer" aria-label={`Открыть фотографию: ${photo.name}`}>
      <img src={image.src} srcSet={photo.variants.map(v=>`${v.src} ${v.width}w`).join(', ')} sizes={cover?'(max-width: 800px) 100vw, 1100px':'(max-width: 800px) 100vw, 760px'} width={image.width} height={image.height} alt={`${photo.name}. ${photo.scene}. Архивная фотография.`} loading={cover?'eager':'lazy'} fetchPriority={cover?'high':'auto'} decoding="async"/>
    </a>
    <figcaption><span className={styles.caption}>{photo.name}. {photo.scene}. Архивный кадр{photo.capturedOn?` от ${photo.capturedOn.split('-').reverse().join('.')}`:''}.</span><span className={styles.credit}>Фото: <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">{photo.author}</a> · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a>. Уменьшение и WebP; лицо и экипировка не изменены.</span></figcaption>
  </figure>;
}
