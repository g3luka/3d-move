import numpy as np, sys
f=2875; cx=2000; cy=1125; h=float(sys.argv[1]) if len(sys.argv)>1 else 1.45; y0=float(sys.argv[2]) if len(sys.argv)>2 else 700
th=np.arctan((cy-y0)/f)
def g(u,v):
    d=np.array([(u-cx)/f,(v-cy)/f,1.0])  # x right, y down, z fwd
    c,s=np.cos(th),np.sin(th)
    # pitch down by th: rotate about x
    dy=d[1]*c+d[2]*s; dz=-d[1]*s+d[2]*c
    t=h/dy
    return np.array([d[0]*t, dz*t])
pts={'kid':(1340,1460),'woman':(2270,1065),'pickup_front':(2510,915),'pickup_rear':(2721,879),'car_rear':(3130,1020),'car_front':(3810,1045),
'tire1':(757,1179),'tire2':(1214,1129),'tire3':(1479,1057),'tire4':(1700,1014),'tire5':(1900,979),'tire6':(2000,940),'tire7':(2164,890),'post':(2914,936),
'fence_a':(86,1240),'fence_b':(670,1200),'kaercher':(1010,1520),
'dirt_L':(2294,1219),'dirt_UL':(2387,1119),'dirt_F1':(2700,1077),'dirt_F2':(3325,1075),'dirt_F3':(3825,1106),'dirt_B1':(2575,1362),'dirt_B2':(2825,1400),'dirt_B3':(3200,1431),'dirt_B4':(3575,1444),'dirt_B5':(3950,1444),
'img_bottom_center':(2000,2250),'img_bottom_left':(0,2250)}
for k,(u,v) in pts.items():
    x,z=g(u,v); print(f"{k:18s} x={x:6.2f} z={z:6.2f}")
