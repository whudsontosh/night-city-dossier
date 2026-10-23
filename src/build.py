import re, os
os.makedirs("../dist",exist_ok=True)
css=open("shared.css").read()
core="/*! morphdom 2.7.4 | MIT License | (c) Patrick Steele-Idem | github.com/patrick-steele-idem/morphdom */\n"+open("vendor/morphdom-umd.min.js").read()+"\n"+open("core.js").read()+"\n"+open("core2.js").read()+"\n"+open("map.js").read()+"\n"+open("table_ui.js").read()
def build(shell,app,out):
    s=open(shell).read()
    s=s.replace("/*CSS*/",css).replace("/*JS*/",core+"\n"+"\n".join(open(a).read() for a in app))
    open(out,"w").write(s)
build("shell_player.html",["guide.js","player.js","player_net.js"],"../dist/night-city-dossier.html")
build("shell_gm.html",["gm.js","gm_net.js"],"../dist/night-city-gm-console.html")
print("built")

# ---- desktop app pages (local fonts, content security policy) ----
import os
DESK="../desktop/app"
os.makedirs(DESK,exist_ok=True)
CSP="default-src 'self' file:; script-src 'self' file: 'unsafe-inline'; style-src 'self' file: 'unsafe-inline'; font-src 'self' file: data:; img-src * data: blob:; media-src * data: blob:; connect-src *; worker-src blob:; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"
def desk(src,out,title=None):
    s=open(src).read()
    s=re.sub(r'<link rel="preconnect"[^>]*>\n?','',s)
    s=re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^"]*">','<link rel="stylesheet" href="fonts/fonts.css">',s)
    s=s.replace('<meta charset="utf-8">','<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="'+CSP+'">',1)
    open(os.path.join(DESK,out),"w").write(s)
desk("../dist/night-city-dossier.html","player.html")
desk("../dist/night-city-gm-console.html","gm.html")
sh=open("shell_player.html").read()
i=sh.index("<body>")+len("<body>");j=sh.index("</body>")
launch=sh[:i].replace("<title>Night City Dossier</title>","<title>Night City Dossier</title>").replace("/*CSS*/",css)+"\n"+open("launcher_body.html").read()+"\n</body>\n</html>\n"
open("../dist/launcher.html","w").write(launch)
desk("../dist/launcher.html","launcher.html")
upd=sh[:i].replace("<title>Night City Dossier</title>","<title>Updating Night City Dossier</title>").replace("/*CSS*/",css)+"\n"+open("update_body.html").read()+"\n</body>\n</html>\n"
open("../dist/update.html","w").write(upd)
desk("../dist/update.html","update.html")
import shutil
os.makedirs(os.path.join(DESK,"fonts"),exist_ok=True)
for f in os.listdir("fonts"):shutil.copy(os.path.join("fonts",f),os.path.join(DESK,"fonts",f))
print("desktop pages built")
