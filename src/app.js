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
        await db.collection("messages").insertOne({ from: name.name, to: "Todos", text: "entra na sala...", type: "status", time: dayjs().format("HH:mm:ss") })
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

app.post("/messages", async (req, res) => {
    const message = req.body
    const from = req.headers.user

    const schema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().required().valid("message", "private_message")
    })

    const validation = schema.validate(message, { abortEarly: false })

    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    }

    try {
        const resp = await db.collection("participants").findOne({ name: from })

        if (!resp) return res.sendStatus(422)

        await db.collection("messages").insertOne({ from: from, to: message.to, text: message.text, type: message.type, time: dayjs().format("HH:mm:ss") })
        res.sendStatus(201)
    } catch {
        res.sendStatus(422)
    }
})

app.get("/messages", async (req, res) => {

    const user = req.headers.user
    const { limit } = req.query

    try {
        const resp = await db.collection("messages").find({
            $or: [
                { from: user },
                { to: user },
                { to: "Todos" }
            ]
        }).toArray()
        if (limit > 0) {
            return res.send(resp.reverse().slice(0, parseInt(limit)))
        }
        else if (!limit) {
            return res.send(resp.reverse().slice(0))
        }
        else {
            return res.sendStatus(422)
        }

    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.post("/status", async (req, res) => {

    const user = req.headers.user
    const lastStatus = Date.now()

    try {
        const resp = await db.collection("participants").findOne({ name: user })

        if (!resp) return res.sendStatus(404)

        const result = await db.collection("participants").updateOne({ name: user }, { $set: { lastStatus } })
        if (result.modifiedCount === 0) return res.sendStatus(404)

        res.sendStatus(200)
    } catch {
        res.sendStatus(404)
    }
})

setInterval( async () => {
    const time = Date.now() - 10000
    const resp = await db.collection("participants").find().toArray()

    resp.forEach(async (element) => {
        if (time > element.lastStatus) {
            await db.collection("participants").deleteOne({ name: element.name })
            await db.collection("messages").insertOne({
                from: element.name,
                to: "Todos",
                text: "sai da sala...",
                type: "status",
                time: dayjs().format("HH:mm:ss")
            })
        }
    })

}, 15000)


const PORT = 5000;

app.listen(PORT);