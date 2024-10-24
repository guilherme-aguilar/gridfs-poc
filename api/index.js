const express = require('express');
const { MongoClient, GridFSBucket } = require('mongodb');
const multer = require('multer');
const { Readable } = require('stream');
const cors = require('cors'); // Importando o cors
require('dotenv').config();
const app = express();

// Configurações do MongoDB
const url = process.env.DB_URL;
const dbName = process.env.DB_NAME;

const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

// Armazenamento em memória para o Multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors({
  origin: 'http://localhost:3001' // Permitir apenas esse domínio
}));

// Variáveis de conexão
let bucket;

// Conectar ao MongoDB
client.connect().then(() => {
    const db = client.db(dbName);
    bucket = new GridFSBucket(db, { bucketName: 'arquivos' });
    console.log('Conectado ao MongoDB e GridFSBucket inicializado.');
}).catch((err) => console.error('Erro ao conectar ao MongoDB:', err));

// Rota para upload de arquivos
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
      return res.status(400).send('Nenhum arquivo foi enviado.');
  }

  const fileStream = Readable.from(req.file.buffer);
  const uploadStream = bucket.openUploadStream(req.file.originalname);

  fileStream.pipe(uploadStream)
      .on('error', (err) => res.status(500).send('Erro ao enviar arquivo: ' + err))
      .on('finish', () => {
          const savedFileName = uploadStream.filename; // Pega o nome do arquivo salvo
          res.status(201).send({
              message: 'Arquivo enviado com sucesso.',
              fileName: savedFileName
          });
      });
});


// Rota para editar/substituir um arquivo existente
app.put('/edit/:filename', upload.single('file'), async (req, res) => {
    const { filename } = req.params;

    // Remover o arquivo antigo
    const db = client.db(dbName);
    const file = await db.collection('arquivos.files').findOne({ filename });
    if (!file) {
        return res.status(404).send('Arquivo não encontrado.');
    }

    const fileId = file._id;
    bucket.delete(fileId, (err) => {
        if (err) return res.status(500).send('Erro ao deletar arquivo antigo.');

        // Fazer o upload do novo arquivo
        const fileStream = Readable.from(req.file.buffer);
        const uploadStream = bucket.openUploadStream(req.file.originalname);

        fileStream.pipe(uploadStream)
            .on('error', (err) => res.status(500).send('Erro no upload: ' + err))
            .on('finish', () => res.status(200).send('Arquivo editado com sucesso.'));
    });
});

// Rota para deletar um arquivo
app.delete('/delete/:filename', async (req, res) => {
    const { filename } = req.params;

    const db = client.db(dbName);
    const file = await db.collection('arquivos.files').findOne({ filename });
    if (!file) {
        return res.status(404).send('Arquivo não encontrado.');
    }

    const fileId = file._id;
    bucket.delete(fileId, (err) => {
        if (err) return res.status(500).send('Erro ao deletar arquivo.');

        res.status(200).send('Arquivo deletado com sucesso.');
    });
});

// Rota para visualizar/baixar um arquivo
app.get('/file/:filename', (req, res) => {
    const { filename } = req.params;

    bucket.openDownloadStreamByName(filename)
        .on('error', () => res.status(404).send('Arquivo não encontrado.'))
        .pipe(res);
});

// Rota para listar todos os arquivos (imagens e outros)
app.get('/files', async (req, res) => {
  const db = client.db(dbName);
  
  try {
      const files = await db.collection('arquivos.files').find().toArray();

      if (!files || files.length === 0) {
          return res.status(404).send('Nenhum arquivo encontrado.');
      }

      res.status(200).json(files);
  } catch (error) {
      res.status(500).send('Erro ao buscar arquivos: ' + error);
  }
});


// Iniciar o servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
