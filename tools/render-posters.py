import numpy as np
from PIL import Image
from pathlib import Path
out=Path(__file__).resolve().parents[1] / 'public'
w,h=880,740
Y,X=np.mgrid[:h,:w];X=(X-w/2)/260;Y=(h/2-Y)/260
a,b=np.deg2rad([55,-28])
R=np.array([[np.cos(b),-np.sin(b),0],[np.sin(b),np.cos(b),0],[0,0,1]])@np.array([[1,0,0],[0,np.cos(a),-np.sin(a)],[0,np.sin(a),np.cos(a)]])
def render(explode):
 def sdf(p):
  x,y,z=np.moveaxis(p,-1,0);r=np.hypot(x,y); layers=[]
  for rad,width,thick,off in [(1.21,.071,.228,.55),(1.085,.065,.205,-.05),(1.006,.027,.15,-.61)]:
   q=np.abs(r-rad)-width+.024;t=np.abs(z-off*explode)-thick+.024
   layers.append(np.hypot(np.maximum(q,0),np.maximum(t,0))+np.minimum(np.maximum(q,t),0)-.024)
  return np.minimum.reduce(layers)
 origin=np.stack([X,Y,np.full_like(X,4)],-1)@R; d=-R[2];travel=np.zeros_like(X)
 for i in range(65):
  dist=sdf(origin+travel[...,None]*d);travel+=np.where((dist>.0002)&(travel<8),dist,0)
 p=origin+travel[...,None]*d;n=np.stack([sdf(p+e*.0005)-sdf(p-e*.0005) for e in np.eye(3)],-1);n/=np.maximum(np.linalg.norm(n,axis=-1,keepdims=True),1e-9)
 rx,ry,rz=np.moveaxis((d-2*np.sum(n*d,axis=-1,keepdims=True)*n)@R.T,-1,0)
 lum=.12+.53*np.exp(-((rx+.56)/.32)**2)+.60*np.exp(-((ry-.63)/.17)**2)+.43*np.exp(-((rx-.81)/.12)**2)+.28*np.exp(-((ry+.79)/.23)**2)
 lum*=np.where(np.hypot(p[:,:,0],p[:,:,1])<1.148,.61,1)
 lum+=np.random.default_rng(31).normal(0,.007,(h,w))+.01*np.sin(p[:,:,2]*2700)
 for name,tint in [('silver',[.91,.94,1]),('graphite',[.47,.51,.60]),('gold',[1,.79,.55])]:
  rgb=np.clip(lum[...,None]*np.array(tint)*255,0,255);alpha=np.where(travel<8,255,0)
  Image.fromarray(np.dstack((rgb,alpha)).astype('uint8')).save(out/(('exploded' if explode else name)+'.webp'),quality=91)
  if explode:break
render(0);render(1)

