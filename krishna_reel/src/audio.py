"""Synthesised soundtrack (no samples, no third-party music): tanpura-style drone, soft
chimes on text reveals, whooshes on transitions, a low 'impact' on the logo reveal and
COMING SOON, and a sparkle tail. Synced to the timeline in render.py."""
import numpy as np, wave, sys
SR=44100; DUR=15.0; N=int(SR*DUR)
rng=np.random.default_rng(1)
t=np.arange(N)/SR
L=np.zeros(N); R=np.zeros(N)
def add(sig,at,pan=0.0,gain=1.0):
    i=int(at*SR); n=min(len(sig),N-i)
    if n<=0: return
    L[i:i+n]+=sig[:n]*gain*(1-max(pan,0)); R[i:i+n]+=sig[:n]*gain*(1+min(pan,0))
def env(n,a,d):  # attack/exp decay
    x=np.arange(n)/SR; return np.minimum(x/a,1)*np.exp(-x/d)
def pluck(f,dur=2.6):
    n=int(dur*SR); x=np.arange(n)/SR; s=np.zeros(n)
    for k in range(1,14):
        s+=np.sin(2*np.pi*f*k*x*(1+0.0003*k*k))*np.exp(-x*(1.2+0.5*k))/k**0.85*(1.4 if k in (3,5) else 1)
    return s*env(n,0.004,5)
def chime(f,dur=3.0):
    n=int(dur*SR); x=np.arange(n)/SR
    s=np.sin(2*np.pi*f*x)+0.5*np.sin(2*np.pi*f*2.76*x)*np.exp(-x*3)+0.3*np.sin(2*np.pi*f*5.4*x)*np.exp(-x*6)
    return s*env(n,0.002,0.9)
def noise_band(n,f0,f1):
    w=rng.standard_normal(n); F=np.fft.rfft(w); fr=np.fft.rfftfreq(n,1/SR)
    p=np.linspace(0,1,len(fr)); c=f0+(f1-f0)*p   # sweeping centre approximated in time below
    return w
def whoosh(dur,f0,f1):
    n=int(dur*SR); w=rng.standard_normal(n); out=np.zeros(n); seg=2048
    for i in range(0,n-seg,seg//2):
        c=f0*(f1/f0)**(i/n); F=np.fft.rfft(w[i:i+seg]*np.hanning(seg)); fr=np.fft.rfftfreq(seg,1/SR)
        F*=np.exp(-((np.log2(fr+1)-np.log2(c))/0.7)**2); out[i:i+seg]+=np.fft.irfft(F,seg)
    x=np.linspace(0,1,n); return out*np.sin(np.pi*x)**1.5
Sa=146.83  # D3
# drone (tanpura cycle Pa Sa Sa low-Sa) every 1.5s
pat=[Sa*1.5,Sa*2,Sa*2,Sa]
k=0; tt=0.0
while tt<DUR-0.5:
    add(pluck(pat[k%4]),tt,pan=(-0.3 if k%2 else 0.3),gain=0.16); tt+=1.5 if k%4!=3 else 1.7; k+=1
# warm pad
pad=sum(np.sin(2*np.pi*f*t+ph)*a for f,a,ph in [(Sa,1,0),(Sa*1.5,0.6,1),(Sa*2,0.45,2),(Sa*3,0.2,0.5),(Sa*2.002,0.4,3)])
swell=np.clip(t/2.5,0,1)*np.where(t>14.2,np.clip((15-t)/0.8,0,1),1)*(0.7+0.3*np.sin(t*0.7))
pad*=swell*0.035; L+=pad; R+=pad
# scene accents
for at,f,p in [(0.55,Sa*8,-0.2),(3.15,Sa*8*1.125,0.2),(6.5,Sa*8*1.5,-0.2)]:
    add(chime(f),at,p,0.10); add(chime(f*1.5),at+0.12,-p,0.06)
add(whoosh(1.3,500,5000),5.7,0,0.5); add(whoosh(1.2,300,4000),9.0,0,0.45)
# logo reveal impact + shimmer chimes
def boom(dur=1.6,f=55):
    n=int(dur*SR); x=np.arange(n)/SR; return np.sin(2*np.pi*(f+60*np.exp(-x*9))*x)*np.exp(-x*3.2)
add(boom(),9.5,0,0.55); add(boom(1.8,49),12.95,0,0.6)
for i,f in enumerate([Sa*8,Sa*8*1.25,Sa*8*1.5,Sa*16]): add(chime(f),10.75+i*0.11,(-1)**i*0.3,0.09)
for i,f in enumerate([Sa*8*1.5,Sa*16*1.125]): add(chime(f),12.4+i*0.5,0,0.08)
# final sparkle arpeggio
for i,f in enumerate([Sa*16,Sa*16*1.125,Sa*16*1.5,Sa*32,Sa*16*1.5,Sa*32*1.125,Sa*64*0.75]):
    add(chime(f,2.2),13.75+i*0.085,(-1)**i*0.4,0.07)
add(chime(Sa*4,4.0),13.25,0,0.18)
# simple stereo reverb (feedback delays)
def reverb(x):
    y=x.copy()
    for d,g in [(0.043,0.38),(0.071,0.3),(0.113,0.24),(0.171,0.18),(0.263,0.12)]:
        k=int(d*SR); y[k:]+=x[:-k]*g
    return y
L=reverb(L); R=reverb(np.roll(R,int(0.011*SR)))
fade=np.where(t>14.5,np.clip((15-t)/0.5,0,1),1)*np.clip(t/0.4,0,1)
st=np.stack([L*fade,R*fade],1); st/=np.abs(st).max()/0.7
pcm=(st*32767).astype(np.int16)
with wave.open('out/audio.wav','wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok',pcm.shape)
