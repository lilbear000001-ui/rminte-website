import re,os,sys
from playwright.sync_api import sync_playwright
P='../cv/project/'
M={'bd9447c74671299c084a3a03488fedc6':'Quantify-Bold.ttf','b01e1334f1f482fe813d5db697bbbdf0':'sapphire-pendant-source-square.jpg','ae3bb969ae78975dfc943e5bef528fbe':'thermal-airflow-poster.jpg','4436d4d27e1fd6459ef497725dd9fa2c':'cartridge-tvc-v2-poster.jpg','ebd38b4030d9d60ab41d63e41f8117a3':'teardown-poster.jpg','b39ee964399b456ff83dd9c90077a777':'logo-white.svg','8fa91298ca0af4d7b0994f8f52fc83e0':'gal43.jpg','ee5fb05210f488f3c567ce095deafd76':'gal150.jpg','ef2f0a0417c71c384aa2a7deedce473f':'GeistPixel-Circle.woff2'}
names=sys.argv[1:] or [f[:-8] for f in os.listdir(P) if f.endswith('.dc.html')]
with sync_playwright() as p:
    b=p.chromium.launch()
    for n in names:
        s=open(P+n+'.dc.html').read()
        for k,v in M.items(): s=s.replace('/_blob/'+k,v)
        s=re.sub(r'<script src="./support.js"></script>','',s)
        s=re.sub(r'<script type="text/x-dc".*?</script>','',s,flags=re.S)
        s=re.sub(r'<link rel="stylesheet" href="https://fonts[^>]*>','',s)
        s=s.replace('<x-dc>','').replace('</x-dc>','').replace('<helmet>','').replace('</helmet>','')
        s=s.replace('<style>','<style>@font-face{font-family:"Geist Pixel";src:url("GeistPixel-Circle.woff2")}',1)
        open(n+'.html','w').write(s)
        m=re.search(r'\.(?:d|r|p|m)\{[^}]*width:(\d+)px',s); w=int(m.group(1)) if m else 1440
        pg=b.new_page(viewport={'width':max(w,390),'height':900})
        pg.goto('file://'+os.getcwd()+'/'+n+'.html'); pg.wait_for_timeout(500)
        print(n,pg.evaluate('document.documentElement.scrollHeight'))
        pg.screenshot(path=n+'.png',full_page=True)
    b.close()
