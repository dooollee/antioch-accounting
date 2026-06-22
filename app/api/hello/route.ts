// app/api/hello/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);


// 1. 회원 목록 조회 (GET 요청 처리)
export async function GET() {
  try {
    // Supabase DB에서 회원 목록 가져오기
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    // 프론트엔드가 기대하는 { config, members } 구조로 반환
    return NextResponse.json({
      config: {
        year: 2026,
        fees: { univ: 5000, youth: 10000 }
      },
      members: members 
    });

  } catch (error) {
    console.error('백엔드 GET 조회 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '데이터를 가져오는 중 오류가 발생했습니다.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// 2. 회원 상태 수정 (PATCH 요청 처리)
export async function PATCH(request: Request) {
  try {
    // 1. 프론트엔드에서 넘어온 바디 값 전체를 받습니다.
    const body = await request.json();
    // id와 나머지 수정할 필드들(...fieldsToUpdate)을 분리합니다.
    const { id, ...fieldsToUpdate } = body;

    // 2. Supabase에 어떤 값이 오든 통째로 넘겨서 업데이트하도록 수정합니다.
    // 이렇게 하면 status 변경이든, 전체 정보 수정이든 이 하나의 구멍으로 다 해결됩니다!
    const { error } = await supabase
      .from('members')
      .update(fieldsToUpdate)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: '업데이트 성공!' });

  } catch (error) {
    console.error('백엔드 PATCH 업데이트 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '데이터를 업데이트하는 중 오류가 발생했습니다.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// 3. 새 회원 등록 (POST 요청 처리)
export async function POST(request: Request) {
  try {
    // 1. 프론트엔드가 보낸 새 회원 정보(이름, 부서, 연락처) 꺼내기
    const body = await request.json();
    const { name, dept, phone } = body;

    // 2. DB에 넣을 완벽한 데이터 형태로 조립하기
    const newMember = {
      id: Date.now().toString(), // 임시 고유 ID (현재 시간 숫자로 생성)
      name: name,
      dept: dept,
      phone: phone,
      "monthlyStatus": Array(12).fill(false), // 가입 시 회비는 12개월 모두 미납(false) 처리
      status: 'active' // 기본 상태는 '활동'
    };

    // 3. Supabase DB에 밀어 넣기 (insert)
    const { error } = await supabase
      .from('members')
      .insert([newMember]); // insert 할 때는 배열 [] 형태로 넣어줍니다.

    if (error) throw error;

    // 4. 성공 메시지와 함께, 방금 만든 새 회원 데이터를 프론트로 돌려줌
    return NextResponse.json({ message: '등록 성공!', newMember: newMember });

  } catch (error) {
    console.error('백엔드 POST 등록 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '등록 중 오류가 발생했습니다.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// 4. 회원 삭제 (DELETE 요청 처리)
export async function DELETE(request: Request) {
  try {
    // 1. 프론트엔드가 보낸 지울 사람의 id 꺼내기
    const body = await request.json();
    const { id } = body;

    // 2. Supabase DB에서 해당 id를 가진 줄(row)을 삭제(delete)하기
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: '삭제 성공!' });

  } catch (error) {
    console.error('백엔드 DELETE 삭제 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}