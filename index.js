const express = require('express')
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://doctors_portal:AzD8zEOOYkqoqDfv@cluster0.uafum.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })

async function run() {
    try {
        await client.connect();
        const srevicesCollection = client.db('doctors_portal').collection('services');
        const bookingCollection = client.db('doctors_portal').collection('bookings');
        const usersCollection = client.db('doctors_portal').collection('users');

        app.get('/services', async (req, res) => {
            const query = {};
            const cursor = srevicesCollection.find(query);
            const services = await cursor.toArray();
            res.send(services)
        });

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })

        app.get('/available', async (req, res) => {
            const date = req.query.date;
            const services = await srevicesCollection.find().toArray();
            const query = { date: date }
            const bookings = await bookingCollection.find(query).toArray();
            services.forEach(service => {
                const serviceBooking = bookings.filter(book => book.treatment === service.name);
                const bookedSlots = serviceBooking.map(book => book.slot);
                const available = service.slots.filter(slot => !bookedSlots.includes(slot));
                service.slots = available;
            })
            res.send(services);
        })

        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = { treatment: booking.treatment, data: booking.data, patient: booking.patient }
            const exsist = await bookingCollection.findOne(query);
            if (exsist) {
                return res.send({ success: false, booking: exsist })
            }
            const result = await bookingCollection.insertOne(booking);
            return res.send({ success: true, result });
        })

        app.get('/booking', async (req, res) => {
            const patient = req.query.patient;
            const query = { patient: patient };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        })
    }
    finally {

    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Doctors portal ')
})

app.listen(port, () => {
    console.log(`Doctor running on port ${port}`)
})