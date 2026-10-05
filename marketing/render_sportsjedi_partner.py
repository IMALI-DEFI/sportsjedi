#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
from datetime import datetime, timezone
import math, os

ROOT=Path("/home/opc/sports-jedi")
OUT=ROOT/"marketing"/"images"
OUT.mkdir(parents=True,exist_ok=True)
LOGO=ROOT/"marketing"/"sports-jedi-logo.webp"
v=max(0,min(2,int(os.getenv("SPORTSJEDI_PARTNER_VARIANT","0"))))
W=H=1080

def font(size,bold=False):
    names=["DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"]
    paths=[]
    for name in names:
        paths += [f"/usr/share/fonts/dejavu-sans-fonts/{name}",f"/usr/share/fonts/truetype/dejavu/{name}"]
    for q in paths:
        if Path(q).exists(): return ImageFont.truetype(q,size)
    return ImageFont.load_default()

def base():
    im=Image.new("RGBA",(W,H),(3,9,18,255))
    glow=Image.new("RGBA",(W,H),(0,0,0,0)); gd=ImageDraw.Draw(glow,"RGBA")
    gd.ellipse((590,-180,1260,490),fill=(0,220,220,70))
    gd.ellipse((-180,700,420,1260),fill=(245,190,65,38))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(130)))
    return im

def add_logo(im):
    if not LOGO.exists(): return
    logo=Image.open(LOGO).convert("RGBA")
    ratio=390/logo.width
    logo=logo.resize((390,int(logo.height*ratio)),Image.Resampling.LANCZOS)
    im.alpha_composite(logo,(62,50))

def stadium(draw):
    for x in range(0,W,90):
        draw.line((x,720,x+260,1080),fill=(20,70,95,45),width=2)
    for y in range(735,1050,52):
        draw.line((0,y,W,y),fill=(20,70,95,34),width=2)
    for x in range(760,1040,58):
        draw.ellipse((x,44,x+18,62),fill=(235,247,255,210))

def chart(draw,pts):
    draw.line(pts,fill=(38,230,230,190),width=6,joint="curve")
    for x,y in pts: draw.ellipse((x-6,y-6,x+6,y+6),fill=(245,200,72,255))

def trophy(draw,cx,cy,s):
    gold=(245,191,65,255); edge=(255,229,145,255)
    draw.ellipse((cx-s*.34,cy-s*.38,cx+s*.34,cy+s*.2),fill=(15,25,32,255),outline=edge,width=8)
    draw.arc((cx-s*.62,cy-s*.34,cx-s*.12,cy+s*.1),80,280,fill=gold,width=12)
    draw.arc((cx+s*.12,cy-s*.34,cx+s*.62,cy+s*.1),260,100,fill=gold,width=12)
    draw.rectangle((cx-s*.06,cy+s*.15,cx+s*.06,cy+s*.48),fill=gold)
    draw.rounded_rectangle((cx-s*.26,cy+s*.44,cx+s*.26,cy+s*.58),radius=12,fill=gold)
    draw.line((cx-s*.2,cy-s*.1,cx+s*.2,cy-s*.1),fill=(40,230,220,230),width=6)

im=base(); add_logo(im); d=ImageDraw.Draw(im,"RGBA"); stadium(d)

if v==0:
    d.text((62,210),"SHARE SPORTS.",font=font(72,True),fill="white")
    d.text((62,290),"EARN 25%.",font=font(84,True),fill=(247,201,73,255))
    d.text((62,404),"Get a tracked referral link and earn",font=font(31),fill=(210,220,228,255))
    d.text((62,450),"recurring commission on eligible paid",font=font(31),fill=(210,220,228,255))
    d.text((62,496),"Sports Jedi subscriptions.",font=font(31),fill=(210,220,228,255))
    trophy(d,835,450,300)
    chart(d,[(610,740),(690,680),(760,710),(835,610),(910,640),(1000,520)])
    d.rounded_rectangle((62,650,570,770),radius=24,fill=(4,18,26,235),outline=(245,191,65,210),width=3)
    d.text((95,675),"25% RECURRING",font=font(38,True),fill=(247,201,73,255))
    d.text((95,723),"UP TO 12 MONTHS",font=font(21,True),fill="white")
elif v==1:
    d.text((62,205),"YOUR AUDIENCE.",font=font(68,True),fill="white")
    d.text((62,280),"YOUR LINK.",font=font(68,True),fill="white")
    d.text((62,355),"YOUR COMMISSION.",font=font(66,True),fill=(247,201,73,255))
    d.text((62,465),"Recommend Sports Jedi to your audience",font=font(30),fill=(210,220,228,255))
    d.text((62,509),"and earn when eligible referrals become",font=font(30),fill=(210,220,228,255))
    d.text((62,553),"paid members.",font=font(30),fill=(210,220,228,255))
    d.rounded_rectangle((690,255,1000,690),radius=42,fill=(8,22,33,245),outline=(38,225,225,180),width=3)
    d.rounded_rectangle((720,290,970,655),radius=24,fill=(4,12,20,255),outline=(255,255,255,35),width=2)
    d.text((758,330),"SPORTS JEDI",font=font(25,True),fill="white")
    d.text((755,395),"PARTNER",font=font(23,True),fill=(45,230,220,255))
    chart(d,[(755,560),(800,525),(845,540),(890,475),(935,455)])
    d.text((755,595),"TRACKED LINK",font=font(18,True),fill=(190,205,214,255))
else:
    d.text((62,205),"TURN SPORTS CONTENT",font=font(61,True),fill="white")
    d.text((62,278),"INTO RECURRING",font=font(64,True),fill=(247,201,73,255))
    d.text((62,350),"REVENUE.",font=font(64,True),fill=(247,201,73,255))
    d.text((62,460),"Built for sports creators, podcasts,",font=font(30),fill=(210,220,228,255))
    d.text((62,504),"communities and analysts.",font=font(30),fill=(210,220,228,255))
    d.rounded_rectangle((695,285,1000,700),radius=44,fill=(8,18,28,245),outline=(245,191,65,165),width=3)
    d.ellipse((775,350,920,495),fill=(5,10,18,255),outline=(247,201,73,230),width=8)
    d.rounded_rectangle((835,430,860,610),radius=10,fill=(247,201,73,255))
    d.arc((790,500,910,640),0,180,fill=(45,230,220,255),width=7)
    d.text((770,650),"CREATOR PARTNER",font=font(18,True),fill="white")

d.rounded_rectangle((62,815,1018,930),radius=28,fill=(3,16,25,240),outline=(38,225,225,190),width=3)
d.text((96,844),"JOIN NOW",font=font(28,True),fill=(48,230,220,255))
d.text((260,844),"sportsjedi.com/referrals",font=font(31,True),fill="white")
d.text((62,972),"25% recurring commission • eligible subscriptions • up to 12 months",font=font(20,True),fill=(190,202,210,230))
d.rounded_rectangle((24,24,1056,1056),radius=38,outline=(255,255,255,24),width=2)

stamp=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
path=OUT/f"sportsjedi_partner_premium_{v+1}_{stamp}.png"
im.convert("RGB").save(path,"PNG",optimize=True)
print(path.resolve())
