// 실행: npm test
import assert from 'node:assert/strict';
import test from 'node:test';
import { duesMonths, fiscalMonthIndex, fiscalYearOf, matchMember, parseBankRows } from './bankImport.ts';

// 국민은행 거래내역 엑셀과 같은 구조 (머리말 4줄 + 머리글 + 최신순 + 합계 줄)
const KB = [
  ['조회기간', '2026.08.03 ~ 2026.10.03', '', '', '', '', '', '', ''],
  ['계좌번호', '000000-00-000000', '', '', '총잔액', '1,440,424', '', '', ''],
  ['예금종류', '통장', '', '', '출금가능금액', '1,440,424', '', '', ''],
  [],
  ['거래일시', '적요', '보낸분/받는분', '송금메모', '출금액', '입금액', '잔액', '거래점', '구분'],
  ['2026.09.28 09:58:55', '전자금융', '홍길동', '', '0', '10,000', '1,440,424', '하나은행', ''],
  ['2026.09.09 10:26:41', '오픈뱅킹출금', '토스 가게', '', '50,000', '0', '1,430,424', '스타뱅', ''],
  ['2026.08.19 08:43:38', 'FBS입금', '대청회비홍길동', '', '0', '120,000', '1,480,424', 'ERP사', ''],
  ['', '', '', '합계', '50,000', '130,000', '', '', ''],
];

test('머리말·합계 줄을 건너뛰고 오래된 순으로 읽는다', () => {
  const { rows, unreadable } = parseBankRows(KB);
  assert.equal(unreadable, 0);
  assert.deepEqual(rows.map((r) => [r.month, r.day, r.text, r.note, r.deposit, r.withdrawal]), [
    [8, 19, '대청회비홍길동', 'FBS입금', 120000, 0],
    [9, 9, '토스 가게', '오픈뱅킹출금', 0, 50000],
    [9, 28, '홍길동', '전자금융', 10000, 0],
  ]);
  assert.equal(new Set(rows.map((r) => r.key)).size, 3);
});

test('컬럼 이름·순서가 다른 은행, 금액이 한 컬럼(+/-)인 은행도 읽는다', () => {
  const { rows } = parseBankRows([
    ['거래일자', '거래시간', '적요', '거래금액'],
    ['2026-01-05', '10:00:00', '홍길동', '-3,000'],
    ['2026-01-05', '10:00:00', '홍길동', '-3,000'],
    ['20260106', '', '김철수', '5000'],
  ]);
  assert.deepEqual(rows.map((r) => [r.day, r.text, r.deposit, r.withdrawal]), [
    [5, '홍길동', 0, 3000],
    [5, '홍길동', 0, 3000],
    [6, '김철수', 5000, 0],
  ]);
  assert.notEqual(rows[0].key, rows[1].key); // 완전히 같은 줄도 따로 식별
});

test('거래내역 표가 없으면 null, 날짜를 못 읽은 줄은 센다', () => {
  assert.equal(parseBankRows([['아무', '내용']]), null);
  assert.equal(parseBankRows([['거래일', '입금', '출금'], ['9월 28일', '1000', '0']]).unreadable, 1);
});

test('회계월: 11월이 0번, 11~12월은 다음 해 회계연도', () => {
  assert.equal(fiscalMonthIndex({ month: 11 }), 0);
  assert.equal(fiscalMonthIndex({ month: 10 }), 11);
  assert.equal(fiscalYearOf({ year: 2025, month: 11 }), 2026);
  assert.equal(fiscalYearOf({ year: 2026, month: 10 }), 2026);
});

test('입금자명으로 회원 찾기: 포함 일치, 겹치면 사람이 고르게 null', () => {
  const members = [{ name: '홍길동' }, { name: '김철수' }, { name: '김철' }];
  assert.equal(matchMember('대청회비 홍길동', members)?.name, '홍길동');
  assert.equal(matchMember('김철수', members)?.name, '김철수'); // 더 긴 이름 우선
  assert.equal(matchMember('토스 가게', members), null);
  assert.equal(matchMember('홍길동', [{ name: '홍길동' }, { name: '홍길동' }]), null); // 동명이인
});

test('회비 월 계산: 이른 미납 월부터, 안 맞는 금액은 null', () => {
  const status = [true, true, false, false, true, false, false, false, false, false, false, false];
  assert.deepEqual(duesMonths(20000, 10000, status), [2, 3]);
  assert.deepEqual(duesMonths(30000, 10000, status), [2, 3, 5]);
  assert.equal(duesMonths(11300, 10000, status), null); // 회비 단위가 아님
  assert.equal(duesMonths(120000, 10000, status), null); // 미납 월보다 많음
});
