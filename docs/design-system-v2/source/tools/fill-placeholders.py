import re,glob,random
def lum(h):
    h=h.lstrip('#');c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    c=[x/12.92 if x<=.03928 else ((x+.055)/1.055)**2.4 for x in c]
    return .2126*c[0]+.7152*c[1]+.0722*c[2]
def cr(a,b):
    l1,l2=sorted([lum(a),lum(b)],reverse=True);return (l1+.05)/(l2+.05)
for bg in ['#141618','#0D0F12','#000000']: print(bg,round(cr('#B6BCC4',bg),1))
def svg(d,s=16,extra=''):
    return f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"{extra}><path d="{d}"/></svg>'
R={'RIGHT':svg('M5 12h14M13 6l6 6-6 6'),'LEFT':svg('M19 12H5M11 6l-6 6 6 6'),'DOWN':svg('M12 5v14M6 13l6 6 6-6',14),'CHEV':svg('M6 9l6 6 6-6',14),
'PRISM12':'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A8B8F0" stroke-width="2" stroke-linejoin="round"><path d="M2 3h20L12 21z"/></svg>',
'SEARCH':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>'}
R['DENSE']=''.join('<i class="a"></i>' for _ in range(36))
random.seed(4)
lit={3,17,22};R['MOE']=''.join('<i class="s"></i>' if i in lit else '<i></i>' for i in range(36))
def glyph(rows):
    n=11;o=''
    for y in range(n):
        for x in range(n):
            on=rows[y][x]=='1'
            o+=f'<circle cx="{x*6+3}" cy="{y*6+3}" r="2" fill="{"#F2F4F6" if on else "rgba(255,255,255,.08)"}"/>'
    return f'<svg class="gl" width="66" height="66" viewBox="0 0 66 66">{o}</svg>'
admin=["00000000000","01110001110","01110001110","01110001110","00000000000","00000000000","01110001110","01110001110","01110001110","00000000000","00000000000"]
root=["00000000000","00000000000","01000000000","00100000000","00010000000","00001000000","00010000000","00100000000","01000000000","00000011111","00000000000"]
sec=["00000000000","00011111000","00111111100","00111011100","00111011100","00111011100","00111111100","00011111000","00001110000","00000100000","00000000000"]
R['G_ADMIN']=glyph(admin);R['G_ROOT']=glyph(root);R['G_SEC']=glyph(sec)
for f in glob.glob('*.dc.html'):
    s=open(f).read();o=s
    for k,v in R.items(): s=s.replace(f'@@{k}@@',v)
    if f=='BgCompare.dc.html':
        s=s.replace('9.3 : 1',f"{cr('#B6BCC4','#141618'):.1f} : 1").replace('10.0 : 1',f"{cr('#B6BCC4','#0D0F12'):.1f} : 1").replace('11.0 : 1',f"{cr('#B6BCC4','#000000'):.1f} : 1")
    if s!=o: open(f,'w').write(s)
    print(f,re.findall(r'@@\w+@@',s))
