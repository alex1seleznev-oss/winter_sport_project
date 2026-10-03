'use client';
import Link from 'next/link';import {useReadingList} from './useReadingList';
export function ReadingLink(){const {status,data}=useReadingList();return <Link href="/reading-list" prefetch={false}>Сохранённые материалы{status==='ready'&&data.items.length>0?` (${data.items.length})`:''}</Link>}
