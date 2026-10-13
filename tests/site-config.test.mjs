import {test} from 'node:test';import assert from 'node:assert/strict';
import {productionOrigin,siteConfiguration} from '../lib/site-config.mjs';
test('canonical site configuration accepts only public root HTTPS domains',()=>{
 assert.equal(productionOrigin(' https://Winter-Sport-Project.vercel.app/ '),'https://winter-sport-project.vercel.app');
 for(const value of ['http://example.org','https://example.org/article','https://example.org/?token=foo','https://example.org/#part','https://user:pass@example.org','https://example.org:444','https://127.0.0.1','https://[::ffff:127.0.0.1]','https://foo.internal','https://localhost','https://bad_host.example.org'])assert.equal(productionOrigin(value),null,value);
});
test('custom domain takes precedence and invalid explicit configuration never falls back',()=>{
 const env={NODE_ENV:'production',VERCEL_ENV:'production',SITE_URL:'https://sports.example.org',VERCEL_PROJECT_PRODUCTION_URL:'old.vercel.app'};
 assert.equal(siteConfiguration(env).origin,'https://sports.example.org');assert.equal(siteConfiguration(env).canIndex,true);
 assert.equal(siteConfiguration({...env,SITE_URL:'https://example.org/path'}).origin,null);
 assert.equal(siteConfiguration({...env,SITE_URL:''}).origin,'https://old.vercel.app');
});
test('preview and local development never become indexable',()=>{
 assert.equal(siteConfiguration({NODE_ENV:'production',VERCEL_ENV:'preview',SITE_URL:'https://sports.example.org'}).canIndex,false);
 assert.equal(siteConfiguration({NODE_ENV:'development',SITE_URL:'https://sports.example.org'}).canIndex,false);
 assert.equal(siteConfiguration({NODE_ENV:'production'}).canIndex,false);
});
test('search engine verification is optional and rejects arbitrary markup',()=>{
 assert.deepEqual(siteConfiguration({GOOGLE_SITE_VERIFICATION:'google_token_123456',YANDEX_SITE_VERIFICATION:'0123456789abcdef'}).verification,{google:'google_token_123456',yandex:'0123456789abcdef'});
 assert.deepEqual(siteConfiguration({GOOGLE_SITE_VERIFICATION:'<script>bad</script>',YANDEX_SITE_VERIFICATION:'invented'}).verification,{});
});
