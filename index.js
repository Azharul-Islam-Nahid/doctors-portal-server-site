const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.pepm1no.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {

    try {
        const appointmentOptionCollection = client.db('doctorsPortal').collection('appointmentOptions');

        const bookingsCollection = client.db('doctorsPortal').collection('bookings');

        // Use aggregate to query multiple collection and then merge data

        app.get('/getAppointmentOptions', async (req, res) => {
            const date = req.query.date;
            console.log(date);
            const query = {};
            const options = await appointmentOptionCollection.find(query).toArray();

            // get the bookings of the provided date

            const bookingQuery = { appointmentDate: date }
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();

            // code carefully!

            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
                const bookSlots = optionBooked.map(book => book.slot);
                const remainingSlots = option.slots.filter(slot => !bookSlots.includes(slot));
                option.slots = remainingSlots;
            })
            res.send(options);
        })

        // ***
        // API Naming Convention
        //bookings 
        //app.get('/bookings')
        // app.get('/bookings:id')
        // app.post('/bookings')
        // app.patch('/bookings/:id')
        // app.delete('/bookings/:id')
        // ***

        app.post('/bookings', async (req, res) => {
            const booking = req.body
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })
    }

    finally {

    }
}
run().catch(console.dir);



app.get('/', async (req, res) => {
    res.send('greetings from doctors portal server')
})

app.listen(port, console.log(`Server running on ${port}`))

