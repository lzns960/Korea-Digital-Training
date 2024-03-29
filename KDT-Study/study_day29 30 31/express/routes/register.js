// @ts-check

const express = require('express');

const crypto = require('crypto');
const router = express.Router();
const mongoClient = require('./mongo');

const createHashedPassword = (password) => {
  const salt = crypto.randomBytes(64).toString('base64');
  // return crypto.createHash('sha512').update(password).digest('base64');
  const hashedPassword = crypto
    .pbkdf2Sync(password, salt, 10, 64, 'sha512')
    .toString('base64');

  return { hashedPassword, salt };
};

/* 암호화 검증 */
const verifyPassword = (password, salt, userPassword) => {
  const hased = crypto
    .pbkdf2Sync(password, salt, 10, 64, 'sha512')
    .toString('base64');

  if (hased === userPassword) return true;
  return false;
};

router.get('/', (req, res) => {
  res.render('register');
});

// get 방식은 쿼리방식으로 써서 url에 보인다. 중요정보는 꼭 post로 하기!
// post 방식으로 register에 요청이 들어오면, id와 pw가 있을테니 중복된 id 체크가능

/* 회원 가입 */
router.post('/', async (req, res) => {
  const client = await mongoClient.connect();
  const userCursor = client.db('kdt1').collection('users');
  const duplicated = await userCursor.findOne({ id: req.body.id });
  const passwordResult = createHashedPassword(req.body.password);

  // 중복된 id가 없다면
  if (duplicated === null) {
    const result = await userCursor.insertOne({
      // 새롭게 생성해주세요.
      id: req.body.id,
      name: req.body.id,
      password: passwordResult.hashedPassword,
      salt: passwordResult.salt,
    });
    // result의 결과가 true면 성공!
    if (result.acknowledged) {
      res.status(200);
      res.send('회원 가입 성공!<br><a href="/login">로그인 페이지로 이동</a>');
    } else {
      // 회원 가입 실패 처리
      res.status(500);
      res.send(
        '회원 가입 문제 발생!<br><a href="/register">회원가입 페이지로 이동</a>'
      );
    }
  } else {
    // 아이디 중복인 경우 예외처리
    res.status(300);
    res.send(
      '중복된 id가 존재합니다!<br><a href="/register">회원가입 페이지로 이동</a>'
    );
  }
});

module.exports = { router, verifyPassword };
