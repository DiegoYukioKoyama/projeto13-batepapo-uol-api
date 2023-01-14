import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";
import dotenv from "dotenv";
dotenv.config()

const mongoClient = new MongoClient(process.env.DATABASE_URL)
let db;

try {
    await mongoClient.connect()
    db = mongoClient.db()
} catch (err) {
    res.status(500).send(err.message)
}

const app = express();
app.use(express.json());
app.use(cors());

app.post("/participants", async (req, res) => {
    const name = req.body
    
    const schema = joi.object({
        name: joi.string().required()
    })

    const validation = schema.validate(name, { abortEarly: false })

    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    }

    try {
        const resp = await db.collection("participants").findOne({ name: name.name })

        if (resp) return res.status(409).send("Participante já existe")

        await db.collection("participants").insertOne({ name: name.name, lastStatus: Date.now() })
        await db.collection("messages").insertOne({ from: name.name, to: "Todos", text: "entra na sala...", type: "status", time: dayjs().format("HH:mm:ss")})
        return res.sendStatus(201)
    } catch (err) {
        return res.sendStatus(422)
    }
})

app.get("/participants", async (req, res) => {
    try {
        const resp = await db.collection("participants").find().toArray()
        res.send(resp)
    } catch (err) {
        res.status(500).send(err.message)
    }
})




const PORT = 5000;

app.listen(PORT);