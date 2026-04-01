-- =====================================================
-- 연구 참여 예약 시스템 - Supabase 데이터베이스 스키마
-- Supabase > SQL Editor 에 붙여넣고 실행하세요
-- =====================================================

-- UUID 확장 활성화
create extension if not exists "uuid-ossp";

-- =====================================================
-- 슬롯 테이블 (관리자가 개설한 예약 가능 시간대)
-- =====================================================
create table slots (
  id uuid default uuid_generate_v4() primary key,
  date date not null,
  time_slot time not null,
  is_booked boolean default false not null,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  constraint slots_date_time_unique unique (date, time_slot)
);

-- =====================================================
-- 예약 테이블 (피험자가 신청한 예약)
-- =====================================================
create table bookings (
  id uuid default uuid_generate_v4() primary key,
  slot_id uuid references slots(id) on delete cascade not null,
  participant_name text not null,
  participant_birthdate date not null,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- =====================================================
-- 측정 테이블 (연구 당일 측정값)
-- =====================================================
create table measurements (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references bookings(id) on delete cascade not null unique,
  height numeric(5,2) not null,
  weight numeric(5,2) not null,
  bmi numeric(4,2) not null,
  grip_strength numeric(5,2) not null,
  measured_at timestamp with time zone default timezone('utc', now()) not null
);

-- =====================================================
-- RLS (Row Level Security) 설정
-- API routes 에서 service role key 로 접근하므로 RLS 활성화
-- =====================================================
alter table slots enable row level security;
alter table bookings enable row level security;
alter table measurements enable row level security;

-- 인덱스 (조회 성능)
create index idx_slots_date on slots(date);
create index idx_bookings_slot_id on bookings(slot_id);
create index idx_bookings_name_birth on bookings(participant_name, participant_birthdate);
create index idx_measurements_booking_id on measurements(booking_id);
