from __future__ import annotations
from datetime import date, datetime, timedelta, timezone
from typing import Optional
import re
import jwt
from jwt import InvalidTokenError
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from pwdlib import PasswordHash
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, create_engine, select, func, or_
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker, Session

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str = Field(min_length=32)
    cors_origins: str = 'http://localhost:5173'
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
hasher = PasswordHash.recommended()
security = HTTPBearer(auto_error=False)

class Base(DeclarativeBase):
    pass

class Department(Base):
    __tablename__ = 'departments'
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(200))

class User(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(30))
    staff_code: Mapped[Optional[str]] = mapped_column(String(70), nullable=True, unique=True)
    department_id: Mapped[int] = mapped_column(ForeignKey('departments.id'))
    requested_role: Mapped[str] = mapped_column(String(30))
    role: Mapped[str] = mapped_column(String(30), default='staff')
    password_hash: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default='pending')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    department: Mapped[Department] = relationship()

class MeetingRoom(Base):
    __tablename__ = 'meeting_rooms'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True)
    location: Mapped[str] = mapped_column(String(200), default='')
    capacity: Mapped[int] = mapped_column(Integer, default=12)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

class Meeting(Base):
    __tablename__ = 'meetings'
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(250))
    topic: Mapped[str] = mapped_column(String(250), default='')
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    room_id: Mapped[Optional[int]] = mapped_column(ForeignKey('meeting_rooms.id'), nullable=True)
    organizer_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    join_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default='scheduled')
    room: Mapped[Optional[MeetingRoom]] = relationship()
    organizer: Mapped[User] = relationship()

class WorkSchedule(Base):
    __tablename__ = 'work_schedules'
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(250))
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    owner_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    location: Mapped[str] = mapped_column(String(200), default='')
    status: Mapped[str] = mapped_column(String(30), default='scheduled')

class Task(Base):
    __tablename__ = 'tasks'
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(250))
    assignee_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    meeting_id: Mapped[Optional[int]] = mapped_column(ForeignKey('meetings.id'), nullable=True)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    priority: Mapped[str] = mapped_column(String(20), default='normal')
    status: Mapped[str] = mapped_column(String(30), default='pending')
    assignee: Mapped[User] = relationship()

class Notification(Base):
    __tablename__ = 'notifications'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text, default='')
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

# Create tables for first-run demo; use Alembic migrations for production changes.
Base.metadata.create_all(bind=engine)
app = FastAPI(title='Quản lý Lịch công tác và Họp chuyên môn API', version='0.1.0')
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings.cors_origins.split(',')], allow_credentials=True, allow_methods=['GET','POST','PATCH','PUT','DELETE'], allow_headers=['Authorization','Content-Type'])

def get_db():
    with SessionLocal() as db:
        yield db

def get_user(credentials: HTTPAuthorizationCredentials | None = Depends(security), db: Session = Depends(get_db)) -> User:
    if not credentials:
        raise HTTPException(401, 'Bạn chưa đăng nhập')
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=['HS256'])
        user_id = int(payload['sub'])
    except (InvalidTokenError, KeyError, ValueError, TypeError):
        raise HTTPException(401, 'Token không hợp lệ hoặc hết hạn')
    user = db.get(User, user_id)
    if user is None or user.status != 'approved':
        raise HTTPException(403, 'Tài khoản chưa được duyệt hoặc bị khóa')
    return user

def require_admin(user: User = Depends(get_user)):
    if user.role != 'admin':
        raise HTTPException(403, 'Yêu cầu quyền quản trị')
    return user

VALID_ROLES = {'leader', 'deputy', 'secretary', 'staff', 'admin'}
class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    phone: str = Field(min_length=9, max_length=30)
    department: str
    role: str
    staff_code: str | None = None
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str
    agreement: bool

    @field_validator('email')
    @classmethod
    def agency_email(cls, v):
        domain = str(v).lower().rsplit('@', 1)[-1]
        if not (domain == 'gov.vn' or domain.endswith('.gov.vn') or domain == 'edu.vn' or domain.endswith('.edu.vn')):
            raise ValueError('Email phải thuộc tên miền gov.vn hoặc edu.vn')
        return str(v).lower()

    @field_validator('role')
    @classmethod
    def valid_role(cls, v):
        if v not in VALID_ROLES:
            raise ValueError('Vai trò không hợp lệ')
        return v

    @model_validator(mode='after')
    def check_credentials(self):
        if self.password != self.confirm_password:
            raise ValueError('Mật khẩu xác nhận không trùng khớp')
        if not (re.search('[A-Z]', self.password) and re.search('[0-9]', self.password) and re.search(r'[^A-Za-z0-9]', self.password)):
            raise ValueError('Mật khẩu cần chữ hoa, chữ số và ký tự đặc biệt')
        if not self.agreement:
            raise ValueError('Bạn phải đồng ý điều khoản')
        return self

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ApprovalIn(BaseModel):
    approved: bool
    role: str | None = None

class MeetingIn(BaseModel):
    title: str = Field(min_length=2)
    topic: str = ''
    start_at: datetime
    end_at: datetime
    room_id: int | None = None
    join_url: str | None = None
    @model_validator(mode='after')
    def times(self):
        if self.start_at.tzinfo is None or self.end_at.tzinfo is None or self.end_at <= self.start_at:
            raise ValueError('Thời gian cần có múi giờ và kết thúc sau bắt đầu')
        return self

class ScheduleIn(BaseModel):
    title: str
    start_at: datetime
    end_at: datetime
    location: str = ''
    @model_validator(mode='after')
    def times(self):
        if self.start_at.tzinfo is None or self.end_at.tzinfo is None or self.end_at <= self.start_at:
            raise ValueError('Thời gian không hợp lệ')
        return self

class TaskIn(BaseModel):
    title: str
    assignee_id: int
    due_at: datetime
    meeting_id: int | None = None
    priority: str = 'normal'

@app.get('/api/health')
def health():
    return {'status': 'ok'}

@app.get('/api/departments')
def departments(db: Session = Depends(get_db)):
    return [{'id': d.id, 'code': d.code, 'name': d.name} for d in db.scalars(select(Department).order_by(Department.id))]

@app.post('/api/auth/register', status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if db.scalar(select(User.id).where(User.email == data.email)):
        raise HTTPException(409, 'Email đã được đăng ký')
    if data.staff_code and db.scalar(select(User.id).where(User.staff_code == data.staff_code)):
        raise HTTPException(409, 'Mã cán bộ đã tồn tại')
    dep = db.scalar(select(Department).where(Department.code == data.department))
    if not dep:
        raise HTTPException(422, 'Phòng ban không hợp lệ')
    user = User(full_name=data.full_name, email=data.email, phone=data.phone, staff_code=data.staff_code or None, department_id=dep.id, requested_role=data.role, role='staff', password_hash=hasher.hash(data.password), status='pending')
    db.add(user)
    db.commit()
    return {'message':'Đã nhận đăng ký. Tài khoản đang chờ quản trị viên phê duyệt.', 'status':'pending'}

@app.post('/api/auth/login')
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == str(data.email).lower()))
    if not user or not hasher.verify(data.password, user.password_hash):
        raise HTTPException(401, 'Email hoặc mật khẩu không chính xác')
    if user.status != 'approved':
        raise HTTPException(403, 'Tài khoản chưa được phê duyệt hoặc đã bị khóa')
    token = jwt.encode({'sub':str(user.id),'exp':datetime.now(timezone.utc)+timedelta(hours=8)}, settings.jwt_secret, algorithm='HS256')
    return {'access_token':token, 'token_type':'bearer','user':user_view(user)}

def user_view(u: User):
    return {'id':u.id,'full_name':u.full_name,'email':u.email,'role':u.role,'status':u.status,'department':u.department.name}

@app.get('/api/auth/me')
def me(user: User = Depends(get_user)):
    return user_view(user)

@app.get('/api/admin/registrations')
def registrations(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.scalars(select(User).where(User.status == 'pending').order_by(User.id)).all()
    return [dict(user_view(u), requested_role=u.requested_role, staff_code=u.staff_code) for u in users]

@app.patch('/api/admin/users/{user_id}/approval')
def approval(user_id: int, data: ApprovalIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user: raise HTTPException(404, 'Không tìm thấy tài khoản')
    if data.approved:
        # Never grant admin through a public registration request.
        role = data.role or user.requested_role
        if role == 'admin': raise HTTPException(403, 'Không cấp admin qua luồng duyệt này')
        if role not in VALID_ROLES: raise HTTPException(422, 'Vai trò không hợp lệ')
        user.role = role
        user.status = 'approved'
    else:
        user.status = 'rejected'
    db.commit()
    return user_view(user)

@app.get('/api/dashboard/summary')
def dashboard(user: User = Depends(get_user), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    vn = timezone(timedelta(hours=7))
    local_date = now.astimezone(vn).date()
    day_start = datetime.combine(local_date, datetime.min.time(), tzinfo=vn)
    day_end = day_start + timedelta(days=1)
    week_start = day_start - timedelta(days=local_date.weekday())
    week_end = week_start + timedelta(days=7)
    mt = select(Meeting).where(Meeting.start_at >= day_start,Meeting.start_at < day_end, Meeting.status != 'cancelled')
    meeting_list = db.scalars(mt.order_by(Meeting.start_at)).all()
    tasks = db.scalars(select(Task).where(Task.assignee_id==user.id,Task.status!='completed').order_by(Task.due_at)).all()
    rooms = db.scalars(select(MeetingRoom).where(MeetingRoom.enabled==True).order_by(MeetingRoom.id)).all()
    return {
      'date':str(local_date),
      'meetings_today':len(meeting_list),
      'schedules_this_week':db.scalar(select(func.count(WorkSchedule.id)).where(WorkSchedule.start_at>=week_start,WorkSchedule.start_at<week_end)) or 0,
      'pending_tasks':len(tasks),
      'unread_notifications':db.scalar(select(func.count(Notification.id)).where(Notification.user_id==user.id,Notification.is_read==False)) or 0,
      'upcoming_meetings':[{'id':m.id,'title':m.title,'start_at':m.start_at.isoformat(),'end_at':m.end_at.isoformat(),'room':m.room.name if m.room else 'Trực tuyến','organizer':m.organizer.full_name,'join_url':m.join_url,'status':m.status} for m in meeting_list],
      'tasks':[{'id':t.id,'title':t.title,'due_at':t.due_at.isoformat(),'priority':t.priority,'status':t.status,'assignee':t.assignee.full_name} for t in tasks[:10]],
      'rooms':[{'id':r.id,'name':r.name,'location':r.location,'capacity':r.capacity,'busy':any(m.room_id==r.id and m.start_at<=now<m.end_at for m in db.scalars(select(Meeting).where(Meeting.room_id==r.id,Meeting.status!='cancelled',Meeting.start_at<=now,Meeting.end_at>now)))} for r in rooms],
    }

@app.get('/api/meetings')
def list_meetings(user: User = Depends(get_user), db: Session = Depends(get_db)):
    return [{'id':m.id,'title':m.title,'start_at':m.start_at,'end_at':m.end_at,'room_id':m.room_id,'status':m.status} for m in db.scalars(select(Meeting).order_by(Meeting.start_at.desc()).limit(100))]

@app.post('/api/meetings',status_code=201)
def create_meeting(data: MeetingIn, user: User = Depends(get_user), db: Session = Depends(get_db)):
    if user.role not in {'admin','leader','deputy','secretary'}:
        raise HTTPException(403,'Không có quyền tạo cuộc họp')
    if data.room_id:
        room = db.get(MeetingRoom,data.room_id)
        if not room or not room.enabled: raise HTTPException(404,'Phòng họp không tồn tại')
        conflict=db.scalar(select(Meeting.id).where(Meeting.room_id==data.room_id,Meeting.status!='cancelled',Meeting.start_at<data.end_at,Meeting.end_at>data.start_at).limit(1))
        if conflict: raise HTTPException(409,'Phòng họp đã được đặt trong khung giờ này')
    meeting = Meeting(title=data.title,topic=data.topic,start_at=data.start_at,end_at=data.end_at,room_id=data.room_id,join_url=data.join_url,organizer_id=user.id)
    db.add(meeting);db.commit();db.refresh(meeting)
    return {'id':meeting.id,'message':'Đã tạo cuộc họp'}

@app.get('/api/rooms')
def list_rooms(user: User = Depends(get_user),db: Session = Depends(get_db)):
    return [{'id':r.id,'name':r.name,'location':r.location,'capacity':r.capacity} for r in db.scalars(select(MeetingRoom).where(MeetingRoom.enabled==True))]

@app.post('/api/schedules',status_code=201)
def create_schedule(data:ScheduleIn,user:User=Depends(get_user),db:Session=Depends(get_db)):
    conflict=db.scalar(select(WorkSchedule.id).where(WorkSchedule.owner_id==user.id,WorkSchedule.status!='cancelled',WorkSchedule.start_at<data.end_at,WorkSchedule.end_at>data.start_at).limit(1))
    if conflict: raise HTTPException(409,'Bạn đã có lịch công tác trong khung giờ này')
    obj=WorkSchedule(title=data.title,start_at=data.start_at,end_at=data.end_at,location=data.location,owner_id=user.id)
    db.add(obj);db.commit();db.refresh(obj)
    return {'id':obj.id,'message':'Đã tạo lịch công tác'}

@app.get('/api/schedules')
def list_schedules(user:User=Depends(get_user),db:Session=Depends(get_db)):
    return [{'id':x.id,'title':x.title,'start_at':x.start_at,'end_at':x.end_at,'location':x.location} for x in db.scalars(select(WorkSchedule).where(WorkSchedule.owner_id==user.id).order_by(WorkSchedule.start_at.desc()).limit(100))]

@app.post('/api/tasks',status_code=201)
def create_task(data:TaskIn,user:User=Depends(get_user),db:Session=Depends(get_db)):
    if user.role not in {'admin','leader','deputy','secretary'}: raise HTTPException(403,'Không có quyền phân công')
    if not db.get(User,data.assignee_id): raise HTTPException(404,'Người được giao không tồn tại')
    if data.meeting_id and not db.get(Meeting,data.meeting_id): raise HTTPException(404,'Cuộc họp không tồn tại')
    obj=Task(**data.model_dump());db.add(obj);db.commit();db.refresh(obj)
    return {'id':obj.id}

@app.get('/api/tasks')
def list_tasks(user:User=Depends(get_user),db:Session=Depends(get_db)):
    return [{'id':x.id,'title':x.title,'due_at':x.due_at,'priority':x.priority,'status':x.status} for x in db.scalars(select(Task).where(Task.assignee_id==user.id))]

@app.get('/api/notifications')
def list_notifications(user:User=Depends(get_user),db:Session=Depends(get_db)):
    return [{'id':x.id,'title':x.title,'content':x.content,'is_read':x.is_read} for x in db.scalars(select(Notification).where(Notification.user_id==user.id))]
