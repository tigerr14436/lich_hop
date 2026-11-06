"""One-time local bootstrap. Only run in a trusted dev environment."""
import os
from sqlalchemy import select
from backend.main import SessionLocal, Department, User, MeetingRoom, hasher

DEPARTMENTS = [
 ('bgh','Ban Giám hiệu / Hội đồng trường'),
 ('hcth','Phòng Hành chính - Tổng hợp'),
 ('tccb','Phòng Tổ chức - Cán bộ'),
 ('cntt','Ban Công nghệ thông tin & Chuyển đổi số'),
 ('qlkh','Phòng Quản lý Khoa học & Hợp tác'),
 ('kcm','Khoa Chuyên môn / Viện Đào tạo'),
 ('other','Trung tâm chức năng khác')]
with SessionLocal() as db:
    for code,name in DEPARTMENTS:
        if not db.scalar(select(Department).where(Department.code==code)):
            db.add(Department(code=code,name=name))
    for name,loc,n in [('Phòng Lotus A','Tầng 3',20),('Hội trường 1','Tầng 1',120),('Phòng VIP 2','Tầng 4',15),('Phòng Hội chẩn 3','Tầng 3',12)]:
        if not db.scalar(select(MeetingRoom).where(MeetingRoom.name==name)):
            db.add(MeetingRoom(name=name,location=loc,capacity=n))
    db.flush()
    email=os.environ.get('ADMIN_EMAIL')
    password=os.environ.get('ADMIN_PASSWORD')
    if email and password:
        if len(password)<12 or password=='CHANGE_ME_TO_A_STRONG_PASSWORD':
            raise ValueError('ADMIN_PASSWORD phải là mật khẩu mạnh, tối thiểu 12 ký tự')
        if not db.scalar(select(User.id).where(User.email==email.lower())):
            dep=db.scalar(select(Department).where(Department.code=='hcth'))
            db.add(User(full_name='Quản trị hệ thống', email=email.lower(),phone='0000000000',department_id=dep.id,requested_role='admin',role='admin',password_hash=hasher.hash(password),status='approved'))
            print('Created admin:',email)
    else:
        print('No admin generated. Set ADMIN_EMAIL and ADMIN_PASSWORD to bootstrap an admin.')
    db.commit()
print('Seed completed.')
