import data from '../../content/editorial/full-season-2526.json';import {ComparisonView} from './ComparisonView';
export function SeasonComparison({initialLeft='botn',initialRight='laegreid',interactive=false}:{initialLeft?:string;initialRight?:string;interactive?:boolean}){return <ComparisonView data={data} initialLeft={initialLeft} initialRight={initialRight} interactive={interactive}/>}
