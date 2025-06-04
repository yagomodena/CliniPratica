import * as functions from "firebase-functions";
import express from "express";

const app = express();

app.use(express.json());

app.post("/webhook", (req, res) => {
  const body = req.body;
  console.log("🔔 Webhook recebido:", JSON.stringify(body));

  res.status(200).send("Webhook recebido com sucesso");
});

exports.api = functions.https.onRequest(app);
