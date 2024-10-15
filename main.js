const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');  // body-parser 추가
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');  // Python 스크립트를 실행하기 위한 모듈

const app = express();
const port = 3000;

app.use(cors());  // CORS 모든 출처에서 허용
app.use(bodyParser.json());  // JSON 형식의 본문을 파싱하기 위해 body-parser 사용
app.use(bodyParser.urlencoded({ extended: true }));  // URL-encoded 데이터 파싱도 가능하게 설정

// MySQL 연결 설정
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'mydb'
});

db.connect((err) => {
    if (err) {
        console.error('MySQL 연결 실패:', err);
        return;
    }
    console.log('MySQL 연결 성공');
});

// Multer를 사용하여 파일을 업로드할 저장소 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');  // 파일 저장 폴더
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));  // 파일 이름 설정
    }
});

const upload = multer({ storage: storage });

// POST 요청을 받아 파일을 업로드하고 Python 코드로 Whisper 모델 호출
app.post('/upload', upload.single('audioFile'), (req, res) => {
    const { language } = req.body;  // 클라이언트에서 전달된 언어 정보
    const filePath = req.file.path;  // 업로드된 파일 경로
    
    // 현재 디렉토리(__dirname)를 기준으로 상대 경로 설정
    const destinationPath = path.join(__dirname, 'uploads', req.file.filename);

    console.log(`File uploaded: ${filePath}`);
    console.log(`Selected language: ${language}`);
    console.log(`Moving file to: ${destinationPath}`);

    // 업로드된 파일을 지정한 경로로 이동
    fs.rename(filePath, destinationPath, (err) => {
        if (err) {
            console.error('Error moving file:', err);
            return res.status(500).send('Error moving file');
        }

        console.log(`File moved to: ${destinationPath}`);

        // Python 스크립트를 호출하여 Whisper 모델 처리
        exec(`python3 ai.py ${destinationPath} ${language}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing Python script: ${error.message}`);
                return res.status(500).send('Error processing audio file');
            }
            if (stderr) {
                console.error(`Python stderr: ${stderr}`);
                return res.status(500).send('Error processing audio file');
            }

            // Python 결과값을 클라이언트로 반환
            console.log(`Python stdout: ${stdout}`);
            res.send({ message: 'Audio file processed', transcription: stdout });
        });
    });
});


// 회원가입 처리 경로
app.post('/register', (req, res) => {
    console.log('POST 요청 수신:', req.body);  // 요청 내용 로그 출력

    const { userNickName, userId, userPw, userNation } = req.body;

    if (!userId || !userPw) {
        return res.status(400).json({ message: '필수 정보를 입력하세요.' });
    }

    const sql = 'INSERT INTO u_info (userNickName, userId, userPw, userNation) VALUES (?, ?, ? ,?)';
    db.query(sql, [userNickName, userId, userPw, userNation], (err, result) => {
        if (err) {
            return res.status(500).json({ message: '회원 정보 삽입 실패', error: err });
        }
        res.status(200).json({ message: '회원가입 성공' });
    });
});


const fs = require('fs');

// 서버 시작 시 uploads 폴더가 없으면 생성
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log('uploads 폴더 생성됨');
}

// 서버 시작
app.listen(port, () => {
    console.log(`서버가 ${port} 포트에서 실행 중`);
});
