import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { Configuration, OpenAIApi } from 'openai';

// DB access codes
// DB implementation
import sqldb from 'sqlite3';

var db = new sqldb.Database(':memory:', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the in-memory SQlite database.');
});

db.serialize(function() {
  db.run("CREATE TABLE user (name text, passd text)");

  var stmt = db.prepare("INSERT INTO user VALUES (?, ?)");
  stmt.run('zxm', 'text');
  stmt.run('user', 'test');
  stmt.finalize();

  db.each("SELECT name, passd from user", function(err, row) {
    console.log("Name: "+row.name, row.passd);
  });
});
// the end of db codes
var calls = 0;

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
  res.status(200).send({
    message: 'Hello from BioSycle1!',
  })
})

async function db_all(query){
  return new Promise(function(resolve,reject){
      db.all(query, function(err,rows){
         if(err){return reject(err);}
         resolve(rows);
       });
  });
}

app.post('/', async (req, res) => {
  let registered = 0;

  
  var row = await db_all("SELECT name, passd from user");
  var i = 0;
  for (i in row) {
    if ((req.body.usr === row[i].name) && (req.body.passd ===row[i].passd)) {
      registered = 1;
      console.log('registered user: ' + req.body.usr);
      console.log("Name: "+row[i].name, row[i].passd);
    }
    i++;
  }
  
  if (registered === 0) {
    console.log('testing user: ' + req.body.usr);
    calls++;
  }

  if ((req.body.usr === 'zxm') && (req.body.passd == 'text')) {
      calls = 0;
  }

  if ((registered === 0) && (calls > 3)) {
      res.status(200).send({
      bot: 'There is no more quota for testing questions, ' + req.body.usr + '. Please register to continue ...'});
  }
  else {
  	try {
    		const prompt = req.body.prompt;

    		const response = await openai.createCompletion({
      		model: "text-davinci-003",
      		prompt: `${prompt}`,
      		temperature: 0, // Higher values means the model will take more risks.
      		max_tokens: 3000, // The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 4096).
      		top_p: 1, // alternative to sampling with temperature, called nucleus sampling
      		frequency_penalty: 0.5, // Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.
      		presence_penalty: 0, // Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.
    		});

    		res.status(200).send({
      			bot: response.data.choices[0].text
    		})
	 	} catch (error) {
    		console.error(error);
    		res.status(500).send(error || 'Something went wrong');
		}
	}
})

// codes to add new user
app.post('/adduser', async (req, res) => {
  if (req.body.usr === 'zxm' && req.body.passd == 'text') {
    var stmt1 = db.prepare("INSERT INTO user VALUES (?, ?)");
    stmt1.run(req.body.newuser, req.body.newpassd);
    stmt1.finalize();
    console.log("Name: "+req.body.newuser, req.body.newpassd);
    res.status(200).send('New user ' + req.body.newuser + ' has been added.');
  }
  else
  {
    res.status(500).send(req.body.usr + ' is not authorized to add new user. Probably the password is wrong.');
  }
})

app.listen(5000, () => console.log('AI server started on http://localhost:5000'));
