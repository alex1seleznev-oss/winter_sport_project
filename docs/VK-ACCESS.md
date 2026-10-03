# VK public group intake: authorization gate

User-requested sources: shlaegreid, bestskiers, biathlon, norways_biathletes, lizzerinofficial. PublicHTML probe returned redirects; no wall messages were imported. A redirect is not proof of a globally unavailable group, nor permission to bypass a login/CAPTCHA.

Official schema: VKCOM/vk-api-schema, wall/methods.json, wall.get (schema version5.199 observed); SDK VKCOM/vk-php-sdk src/VK/Actions/Wall.php. The official method supports domain, filter=owner, bounded count and extended response. A permitted user/service credential depends on the app and method's actual granted access. A Telegram bot token does not grant arbitrary channel access or VK permissions.

No VK app, secret or token has been provisioned in this work. Only an authorized app connection or credential issued to the owner for permitted public-group access may be used. Store it using the provider/repository secret interface, never a chat message or committed .env. Grant only needed read access; verify API errors5/15/27, groupidentity(screen_name,id,is_closed=0) and postowner before staging. Do not fetch userprofiles, members, private messages, comment authors or attachments for this project.

Future integration must POST token-bearing calls only to the fixed official api.vk.com method endpoint, sanitize error/log output and never follow redirects with credentials. Token eligibility is not assumed from an unrelated example app ID. Until an authorized connection is configured, status is needs_authorized_api, and the existing public-only worker makes NO VK request. Instagram remains separately unconnected. This guide is not a claim that a credential exists or live VK parsing succeeded.
