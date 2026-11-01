"""Procedural, lit & shaded spice sprites (normal-mapped, Phong) -> sprites/*.png
Everything is generated in code (no third-party artwork)."""
import numpy as np, math, os
from PIL import Image, ImageFilter
OUT='sprites'; os.makedirs(OUT,exist_ok=True)
SS=2            # supersample
LIGHT=np.array([-0.45,-0.62,0.64]); LIGHT/=np.linalg.norm(LIGHT)

def vnoise(h,w,cell,seed,oct=3):
    rng=np.random.default_rng(seed); out=np.zeros((h,w),np.float32); amp=1; tot=0
    for o in range(oct):
        c=max(2,int(cell/(2**o)))
        g=rng.random((h//c+3,w//c+3)).astype(np.float32)
        im=Image.fromarray((g*255).astype(np.uint8)).resize((w+c*2,h+c*2),Image.BICUBIC).crop((0,0,w,h))
        out+=np.asarray(im,np.float32)/255*amp; tot+=amp; amp*=0.5
    return out/tot-0.5

def blur(a,r):
    a=np.asarray(a,np.float32); h,w=a.shape[:2]
    fy=np.fft.fftfreq(h)[:,None]; fx=np.fft.rfftfreq(w)[None,:]
    g=np.exp(-2*(np.pi**2)*(r**2)*(fx**2+fy**2)).astype(np.float32)
    if a.ndim==2: return np.fft.irfft2(np.fft.rfft2(a)*g,s=(h,w)).astype(np.float32)
    return np.stack([np.fft.irfft2(np.fft.rfft2(a[...,i])*g,s=(h,w)) for i in range(a.shape[2])],-1).astype(np.float32)

def grid(n):
    y,x=np.mgrid[0:n,0:n].astype(np.float32)/n; return x,y

def tube(x,y,pts,rad,res=160):
    """distance-to-polyline height field. pts Nx2 (0..1), rad(t)->radius. returns h,t,u(signed offset/r),mask"""
    pts=np.asarray(pts,np.float32)
    for _ in range(3):
        if len(pts)<3: break
        q=[pts[0]]
        for a_,b_ in zip(pts[:-1],pts[1:]): q+= [0.75*a_+0.25*b_,0.25*a_+0.75*b_]
        q.append(pts[-1]); pts=np.array(q,np.float32)
    P=[];T=[]
    seg=len(pts)-1
    for i in range(seg):
        for k in range(res//seg):
            f=k/(res//seg); P.append(pts[i]*(1-f)+pts[i+1]*f); T.append((i+f)/seg)
    P.append(pts[-1]);T.append(1.0)
    P=np.array(P);T=np.array(T,np.float32)
    best=np.full(x.shape,9e9,np.float32); bt=np.zeros(x.shape,np.float32); bs=np.zeros(x.shape,np.float32)
    # tangent for sign
    tang=np.gradient(P,axis=0); tang/=np.linalg.norm(tang,axis=1,keepdims=True)+1e-9
    for p,t,tg in zip(P,T,tang):
        dx=x-p[0];dy=y-p[1]; d2=dx*dx+dy*dy
        m=d2<best; best=np.where(m,d2,best); bt=np.where(m,t,bt)
        bs=np.where(m,dx*(-tg[1])+dy*tg[0],bs)
    d=np.sqrt(best); r=rad(bt); u=np.clip(bs/np.maximum(r,1e-4),-1,1)
    h=np.sqrt(np.clip(r*r-d*d,0,None))/np.maximum(r,1e-4)*r
    return h,bt,u,(d<r)

def lit(h,alb,mask,spec=0.4,shin=30,bump=1.0,amb=0.38,rim=0.35,k=None):
    n=h.shape[0]
    k=k or n*1.0
    gy,gx=np.gradient(h); gx=gx*n; gy=gy*n
    nx=-gx*bump;ny=-gy*bump;nz=np.ones_like(h)
    L=np.sqrt(nx*nx+ny*ny+nz*nz); nx/=L;ny/=L;nz/=L
    dif=np.clip(nx*LIGHT[0]+ny*LIGHT[1]+nz*LIGHT[2],0,1)
    Hh=np.array([LIGHT[0],LIGHT[1],LIGHT[2]+1]);Hh/=np.linalg.norm(Hh)
    sp=np.clip(nx*Hh[0]+ny*Hh[1]+nz*Hh[2],0,1)**shin*spec
    # occlusion: darker near the silhouette
    mb=blur(mask.astype(np.float32),n*0.02)
    ao=np.clip(0.55+0.45*np.minimum(1,h/(h.max()*0.35+1e-6)),0,1)
    shade=(amb+(1-amb)*dif)*ao
    col=alb*shade[...,None]+sp[...,None]*255*0.9
    # warm bounce light from bottom-right
    col+=np.clip(-(nx*0.5+ny*0.6),0,1)[...,None]*rim*np.array([60,38,18])*(mask[...,None])
    return np.clip(col,0,255)

def finish(col,mask,name,size,pad_blur=0.8):
    n=col.shape[0]
    a=blur(mask.astype(np.float32),1.1*SS*0.5)
    a=np.clip((a-0.5)*2.4+0.5,0,1) if False else np.clip(a,0,1)
    # bleed colour into transparent area
    wc=blur(col*mask[...,None],4); wa=blur(mask.astype(np.float32),4)+1e-4
    bleed=wc/wa[...,None]
    col=np.where(mask[...,None]>0.5,col,bleed)
    rgba=np.dstack([col,a*255]).clip(0,255).astype(np.uint8)
    im=Image.fromarray(rgba,'RGBA').resize((size,size),Image.LANCZOS)
    im.save(f'{OUT}/{name}.png')
    return im

def S(n): return n*SS
sn=lambda v: np.abs(np.sin(v))

def sphere(r=0.46,c=(0.5,0.5)):
    pass

def make_pepper(seed=1,size=512):
    n=S(size);x,y=grid(n); d=np.hypot(x-.5,y-.5); r=0.44
    h=np.sqrt(np.clip(r*r-d*d,0,None))
    h=h+0.035*vnoise(n,n,n//9,seed,3)*(h>0)+0.012*vnoise(n,n,n//30,seed+5,2)
    m=(d<r).astype(np.float32)
    nz=vnoise(n,n,n//10,seed+9,3)
    alb=np.stack([42+nz*38,30+nz*28,22+nz*20],-1)
    col=lit(h*1.0,alb,m,spec=0.55,shin=24,bump=1.0,amb=0.42)
    return finish(col,m,f'pepper{seed}',size)

def make_coriander(seed=1,size=512):
    n=S(size);x,y=grid(n); dx=x-.5;dy=y-.5; d=np.hypot(dx,dy); r=0.43
    h=np.sqrt(np.clip(r*r-d*d,0,None))
    ang=np.arctan2(dy,dx)+seed
    rid=0.016*np.cos(ang*8)*(d/r)**1.5
    h=h+rid*(h>0)+0.012*vnoise(n,n,n//30,seed,2)
    # little cap (stylopodium) bump at centre
    h+=0.04*np.exp(-(d/0.07)**2)
    m=(d<r).astype(np.float32)
    nz=vnoise(n,n,n//8,seed+3,3)
    alb=np.stack([205+nz*30,152+nz*28,78+nz*20],-1)
    col=lit(h,alb,m,spec=0.25,shin=14,bump=1.0,amb=0.45)
    return finish(col,m,f'coriander{seed}',size)

def tube_sprite(name,pts,rad,albf,size=512,spec=0.35,shin=22,bump=1.0,ridge=None,seed=1,amb=0.4,extra=None):
    n=S(size);x,y=grid(n)
    h,t,u,m=tube(x,y,pts,rad)
    if ridge: h=h+ridge(t,u)*(m)
    h=h+0.006*vnoise(n,n,n//25,seed,3)*m
    alb=albf(t,u,n,seed)
    mm=m.astype(np.float32)
    if extra: h,alb,mm=extra(x,y,h,alb,mm,n)
    col=lit(h,alb,mm,spec=spec,shin=shin,bump=bump,amb=amb)
    return finish(col,mm,name,size)

def make_cumin(seed=1,size=512):
    pts=[(0.18,0.72),(0.36,0.52),(0.55,0.4),(0.82,0.28)] if seed%2 else [(0.2,0.3),(0.4,0.48),(0.62,0.6),(0.82,0.74)]
    rad=lambda t:0.105*np.clip(sn(np.pi*np.clip(t,0.02,0.98))**0.45,0.05,1)
    def albf(t,u,n,s):
        nz=vnoise(n,n,n//10,s,3)
        return np.stack([150+nz*28-18*np.abs(u),122+nz*22-16*np.abs(u),66+nz*14-10*np.abs(u)],-1)
    ridge=lambda t,u:0.014*np.cos(u*np.pi*2.5)**2*(1-np.abs(u))
    return tube_sprite(f'cumin{seed}',pts,rad,albf,size,spec=0.12,shin=10,bump=1.0,ridge=ridge,seed=seed)

def make_fennel(seed=1,size=512):
    pts=[(0.15,0.7),(0.35,0.5),(0.6,0.4),(0.85,0.3)]
    rad=lambda t:0.12*np.clip(sn(np.pi*np.clip(t,0.02,0.98))**0.4,0.05,1)
    def albf(t,u,n,s):
        nz=vnoise(n,n,n//10,s,3)
        return np.stack([170+nz*26-14*np.abs(u),168+nz*24-14*np.abs(u),98+nz*16-10*np.abs(u)],-1)
    ridge=lambda t,u:0.02*np.cos(u*np.pi*3)**2*(1-np.abs(u))
    return tube_sprite(f'fennel{seed}',pts,rad,albf,size,spec=0.15,shin=10,bump=1.0,ridge=ridge,seed=seed)

def make_cardamom(seed=1,size=512):
    pts=[(0.15,0.62),(0.4,0.5),(0.62,0.46),(0.86,0.36)]
    rad=lambda t:0.19*np.clip(sn(np.pi*np.clip(t,0.0,1.0))**0.62,0.03,1)
    def albf(t,u,n,s):
        nz=vnoise(n,n,n//9,s,3)
        gr=np.clip(1-np.abs(t-0.5)*1.6,0,1)
        return np.stack([135+nz*26+40*(1-gr)-22*np.abs(u),158+nz*22+20*(1-gr)-22*np.abs(u),72+nz*16+10*(1-gr)-12*np.abs(u)],-1)
    ridge=lambda t,u:0.012*np.cos(u*np.pi*3.5)*(1-np.abs(u)**2)
    return tube_sprite(f'cardamom{seed}',pts,rad,albf,size,spec=0.22,shin=18,bump=1.0,ridge=ridge,seed=seed)

def make_chilli(seed=1,size=640):
    pts=[(0.10,0.84),(0.26,0.80),(0.46,0.66),(0.66,0.46),(0.82,0.26),(0.88,0.14)]
    def rad(t):
        body=0.098*np.sqrt(np.clip(t/0.9,0,1))*(1-0.12*np.clip(t/0.9,0,1)**3)
        stem=0.016+0.012*np.clip((t-0.9)/0.1,0,1)
        return np.where(t<0.9,np.maximum(body,0.004),stem)
    def albf(t,u,n,s):
        nz=vnoise(n,n,n//12,s,3)
        g=np.clip((t-0.9)*40,0,1)
        r=170+nz*22-40*np.abs(u)**2; gg=20+nz*8; b=16+nz*6
        return np.stack([r*(1-g)+92*g,gg*(1-g)+108*g,b*(1-g)+44*g],-1)
    ridge=lambda t,u:0.0*u
    return tube_sprite(f'chilli{seed}',pts,rad,albf,size,spec=0.9,shin=40,ridge=ridge,seed=seed,amb=0.36)

def make_cinnamon(seed=1,size=640):
    pts=[(0.1,0.62),(0.5,0.5),(0.9,0.38)]
    rad=lambda t:0.085+0*t
    def albf(t,u,n,s):
        nz=vnoise(n,n,n//4,s,3); nz2=vnoise(n,n,n//2,s+7,2)
        v=0.5*nz+0.5*np.sin(u*9+nz2*6)*0.3
        return np.stack([172+v*40-36*np.abs(u),104+v*30-26*np.abs(u),52+v*18-14*np.abs(u)],-1)
    ridge=lambda t,u:0.012*np.sin(u*7)
    def extra(x,y,h,alb,m,n):
        # open spiral end-cap at the left end
        cx,cy=0.1,0.62; a,b=0.036,0.088
        e=((x-cx)/a)**2+((y-cy)/b)**2
        cap=e<1
        r=np.sqrt(e)
        ring=0.5+0.5*np.sin(r*18)
        capcol=np.stack([150-70*ring,86-44*ring,42-24*ring],-1)
        alb=np.where(cap[...,None],capcol,alb)
        h=np.where(cap,h.max()*0.55-0.05*ring,h)
        m=np.maximum(m,cap.astype(np.float32))
        return h,alb,m
    return tube_sprite(f'cinnamon{seed}',pts,rad,albf,size,spec=0.18,shin=10,bump=1.0,ridge=ridge,seed=seed,extra=extra)

def make_clove(seed=1,size=512):
    n=S(size);x,y=grid(n)
    h1,t1,u1,m1=tube(x,y,[(0.5,0.96),(0.5,0.36)],lambda t:0.028+0.03*(1-t))
    hs=np.sqrt(np.clip(0.125**2-((x-.5)**2+(y-.24)**2),0,None))
    ms=((x-.5)**2+(y-.24)**2)<0.125**2
    # four sepals
    h=np.maximum(h1*(m1),hs*(ms)); m=(m1|ms)
    for dx_,dy_ in [(-0.15,0.2),(0.15,0.2),(-0.1,0.33),(0.1,0.33)]:
        hh,tt,uu,mm=tube(x,y,[(0.5,0.36),(0.5+dx_,dy_)],lambda t:0.04*(1-0.5*t)+0.005)
        h=np.maximum(h,hh*mm*1.15); m=m|mm
    h=h+0.01*vnoise(n,n,n//20,seed,3)*m
    nz=vnoise(n,n,n//10,seed,3)
    shaft=np.stack([76+nz*22,44+nz*14,26+nz*10],-1)
    head=np.stack([110+nz*24,68+nz*16,40+nz*12],-1)
    alb=np.where(ms[...,None],head,shaft)
    col=lit(h,alb,m.astype(np.float32),spec=0.2,shin=14,bump=1.0,amb=0.4)
    return finish(col,m.astype(np.float32),f'clove{seed}',size)

def make_staranise(seed=1,size=640):
    n=S(size);x,y=grid(n); h=np.zeros((n,n),np.float32); m=np.zeros((n,n),bool)
    alb=np.zeros((n,n,3),np.float32); nz=vnoise(n,n,n//9,seed,3)
    for k in range(8):
        a=k*math.pi/4+0.2
        dx,dy=math.cos(a),math.sin(a)
        p0=(0.5,0.5); p1=(0.5+dx*0.4,0.5+dy*0.4)
        hh,tt,uu,mm=tube(x,y,[p0,p1],lambda t:0.105*np.clip(sn(np.pi*np.clip(t*0.85+0.18,0,1))**0.6,0.06,1))
        # open seam
        hh=hh*(1-0.25*np.exp(-(uu/0.18)**2)*(tt>0.25))
        upd=(hh>h)&mm
        a_=np.stack([128+nz*34-30*np.abs(uu),60+nz*20-18*np.abs(uu),32+nz*12-10*np.abs(uu)],-1)
        # seed
        sd=((tt>0.4)&(tt<0.66)&(np.abs(uu)<0.34)&mm)
        a_=np.where(sd[...,None],np.stack([38+nz*10,22+nz*6,14+nz*4],-1)*1.0,a_)
        h=np.where(upd,hh+0.01*sd,h); alb=np.where(upd[...,None],a_,alb); m|=mm
    cen=np.hypot(x-.5,y-.5)<0.07
    h=np.where(cen,np.maximum(h,0.06),h); alb=np.where(cen[...,None],np.array([90,42,24])+nz[...,None]*20,alb); m|=cen
    col=lit(h,alb,m.astype(np.float32),spec=0.3,shin=20,bump=1.0,amb=0.4)
    return finish(col,m.astype(np.float32),f'staranise{seed}',size)

def make_fenugreek(seed=1,size=320):
    n=S(size);x,y=grid(n)
    # rounded rectangle, inflated
    cx,cy=0.5,0.5; a,b=0.33,0.25
    q=np.maximum(np.abs(x-cx)-a+0.1,0)**2+np.maximum(np.abs(y-cy)-b+0.1,0)**2
    d=np.sqrt(q)
    # rotate
    th=0.5+seed
    xr=(x-.5)*math.cos(th)-(y-.5)*math.sin(th)+.5; yr=(x-.5)*math.sin(th)+(y-.5)*math.cos(th)+.5
    q=np.maximum(np.abs(xr-cx)-a+0.12,0)**2+np.maximum(np.abs(yr-cy)-b+0.12,0)**2
    d=np.sqrt(q); r=0.12
    h=np.sqrt(np.clip(r*r-d*d,0,None))
    m=(d<r).astype(np.float32)
    # diagonal groove
    g=np.abs((xr-cx)*0.55-(yr-cy))
    h=h-0.025*np.exp(-(g/0.012)**2)*m
    nz=vnoise(n,n,n//8,seed,3)
    alb=np.stack([208+nz*30,152+nz*26,44+nz*14],-1)
    col=lit(h,alb,m,spec=0.3,shin=18,bump=1.0,amb=0.42)
    return finish(col,m,f'fenugreek{seed}',size)

def make_leaf(seed=1,size=640,hue=0):
    n=S(size);x,y=grid(n)
    pts=[(0.1,0.78),(0.45,0.5),(0.9,0.2)]
    rad=lambda t:0.2*np.clip(sn(np.pi*np.clip(t,0,1))**0.85,0.0,1)
    h,t,u,m=tube(x,y,pts,rad)
    h=h*0.35+0.0
    # midrib and veins
    h=h+0.02*np.exp(-(u/0.08)**2)*m
    veins=np.cos((t*9*np.pi)+np.abs(u)*3)**10*0.004*(np.abs(u)>0.1)
    h=h+veins*m
    nz=vnoise(n,n,n//6,seed,3)
    g=np.clip(0.5+0.5*u,0,1)
    alb=np.stack([34+nz*20+22*(1-np.abs(u)),92+nz*28+28*(1-np.abs(u)),30+nz*14+8*(1-np.abs(u))],-1)
    alb[...,0]+=hue
    alb=np.where((np.abs(u)<0.07)[...,None]&m[...,None],alb+np.array([60,50,10]),alb)
    col=lit(h,alb,m.astype(np.float32),spec=0.45,shin=26,bump=1.0,amb=0.45)
    return finish(col,m.astype(np.float32),f'leaf{seed}',size)

# ---------------- bowls with powder mounds -------------
def make_bowl(name,powder,seed=1,W=640,H=470,grain=(0.5,0.25)):
    s=2; w,h=W*s,H*s
    y,x=np.mgrid[0:h,0:w].astype(np.float32)
    cx=w/2; ryc=0.40*h; A=0.43*w; B=0.12*h          # rim ellipse
    bcy=0.84*h; bA=0.19*w; bB=0.05*h                  # base ellipse
    col=np.zeros((h,w,3),np.float32); alpha=np.zeros((h,w),np.float32)
    nz=vnoise(h,w,w//10,seed,4)
    # --- outer body (surface of revolution)
    t=np.clip((y-ryc)/(bcy-ryc),0,1)
    halfw=bA+(A-bA)*(1-t**0.9)**0.62
    nxn=(x-cx)/np.maximum(halfw,1)
    body=(np.abs(nxn)<1)&(y>=ryc)&(y<=bcy+bB*np.sqrt(np.clip(1-nxn**2,0,1)))
    inside_rim_front=((x-cx)/A)**2+((y-ryc)/B)**2<1
    ang=np.arcsin(np.clip(nxn,-1,1))
    dif=np.clip(np.cos(ang+0.7)*0.9+0.18,0,1)
    grainv=0.5+0.5*np.sin((y*0.09+nz*14+np.sin(x*0.004)*2))
    base=np.stack([150,84,40],-1).astype(np.float32)
    wood=base[None,None,:]*(0.55+0.5*dif[...,None])*(0.88+0.2*grainv[...,None])
    # glossy highlight band
    hl=np.exp(-((nxn+0.45)/0.12)**2)*(1-t)**0.6*0.35
    wood=wood+hl[...,None]*np.array([255,215,150])
    # darken toward the base, light bounce on right
    wood*= (1-0.25*t)[...,None]
    wood+=np.exp(-((nxn-0.82)/0.12)**2)[...,None]*np.array([30,16,6])
    col=np.where(body[...,None],wood,col); alpha=np.maximum(alpha,body.astype(np.float32))
    # --- rim ring (lighter wood)
    e_out=((x-cx)/A)**2+((y-ryc)/B)**2
    ia,ib=A-26,B-8
    e_in=((x-cx)/ia)**2+((y-ryc)/ib)**2
    ring=(e_out<1)&(e_in>=1)
    rt=np.arctan2(y-ryc,x-cx)
    rimc=np.array([190,116,58])*(0.75+0.3*np.cos(rt+2.2))[...,None]*(0.9+0.2*grainv[...,None])
    rimc=rimc+np.exp(-((e_out-0.88)/0.05)**2)[...,None]*np.array([60,40,20])
    col=np.where(ring[...,None],rimc,col); alpha=np.maximum(alpha,ring.astype(np.float32))
    # --- interior (dark) then powder mound
    inner=e_in<1
    col=np.where(inner[...,None],np.array([60,30,14]),col); alpha=np.maximum(alpha,inner.astype(np.float32))
    # mound mask: dome above rim ellipse + lower half ellipse
    dxm=(x-cx)/ia
    peak=0.30*h
    top=ryc-peak*np.clip(1-np.abs(dxm),0,1)**1.35-6*np.clip(1-np.abs(dxm),0,1)*0
    lower=ryc+ib*np.sqrt(np.clip(1-dxm**2,0,1))
    mound=(np.abs(dxm)<1)&(y>=top)&(y<=lower)
    mm=mound.astype(np.float32)
    # inflate for a height field, add multi-scale granular noise
    hf=blur(mm,22*s/2)
    hf=hf/hf.max()
    gn=vnoise(h,w,6,seed+11,3)*0.05+vnoise(h,w,30,seed+4,3)*0.12+vnoise(h,w,3,seed+8,1)*0.03
    hh=(hf+gn*mm)*140*s/2
    gy,gx=np.gradient(hh)
    nx_,ny_=-gx*1.4,-gy*1.4; nz_=np.ones_like(hh)
    L=np.sqrt(nx_**2+ny_**2+nz_**2); nx_/=L;ny_/=L;nz_/=L
    dif2=np.clip(nx_*LIGHT[0]+ny_*LIGHT[1]+nz_*LIGHT[2],0,1)
    pc=np.array(powder,np.float32)
    pw=pc[None,None,:]*(0.40+0.78*dif2[...,None])
    pw*= (0.93+0.2*vnoise(h,w,2,seed+21,1)[...,None]*2)
    pw+=np.clip(dif2-0.9,0,1)[...,None]*140
    # shadow inside bowl from mound at the rim's base
    col=np.where(mound[...,None],pw,col); alpha=np.maximum(alpha,mm)
    # peak mound drifts slightly over the rim: soft contact shade on the front rim
    sh=np.clip(1-(y-lower)/18,0,1)*(((y>lower)&(e_out<1)&(~inner)).astype(np.float32))*0.0
    col=np.clip(col,0,255)
    img=finish(col,alpha,'_tmp',max(W,H)) if False else None
    a=blur(alpha,1.0); wc=blur(col*alpha[...,None],4); wa=blur(alpha,4)+1e-4
    col=np.where(alpha[...,None]>0.5,col,wc/wa[...,None])
    rgba=np.dstack([col,a*255]).clip(0,255).astype(np.uint8)
    Image.fromarray(rgba,'RGBA').resize((W,H),Image.LANCZOS).save(f'{OUT}/{name}.png')

if __name__=='__main__':
    for s in (1,2,3): make_pepper(s)
    for s in (1,2): make_coriander(s); make_cumin(s)
    make_fennel(1); make_cardamom(1); make_cardamom(2); make_chilli(1); make_cinnamon(1)
    make_clove(1); make_staranise(1); make_fenugreek(1); make_fenugreek(2); make_leaf(1); make_leaf(2,hue=-10)
    make_bowl('bowl_turmeric',(236,160,14),1)
    make_bowl('bowl_chilli',(196,28,12),2)
    make_bowl('bowl_coriander',(158,138,62),3)
    make_bowl('bowl_cumin',(146,112,64),4)
    # contact sheet
    import glob
    fs=sorted(glob.glob(f'{OUT}/*.png')); sheet=Image.new('RGB',(1600,1100),(250,244,230)); xx=yy=0
    for f in fs:
        im=Image.open(f).convert('RGBA'); im.thumbnail((300,300)); 
        if xx+im.width>1600: xx=0;yy+=300
        sheet.paste(im,(xx,yy),im); xx+=im.width+8
    sheet.save('/tmp/claude-0/-home-user-Growthx/b20d5bf1-dca8-5a02-a5e3-f73a71d11129/scratchpad/sheet.png')
