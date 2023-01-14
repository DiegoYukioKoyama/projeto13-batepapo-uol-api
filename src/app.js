import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import joi from "joi";
import dotenv from "dotenv";
dotenv.config()

const mongoClient = new MongoClient(process.env.DATABASE_URL)
let db;

try {
    await mongoClient.connect()
    db = mongoClient.db()
} catch(err){
    res.status(500).send(err.message)
}

const app = express();
app.use(express.json());
app.use(cors());

app.post("/participants", async (req, res) => {
    const name = req.body

    const nameSchema = joi.object({
        name: joi.string().required()
    })

    const validation = nameSchema.validate(name)

    try {
        const resp = await db.collection("participants").findOne({name: name.name})

        if(resp) return res.status(409).send("Participante já existe")

        await db.collection("participants").insertOne({name: name.name})
        res.send("ok")
    } catch(err){
        return res.status(500).send(err.message)
    }
})





const PORT = 5000;

app.listen(PORT);