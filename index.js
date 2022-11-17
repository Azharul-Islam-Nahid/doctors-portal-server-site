const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const jwt = require('jsonwebtoken');
const { query } = require('express');
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
        const usersCollection = client.db('doctorsPortal').collection('users');

        function verifyJWT(req, res, next) {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).send('unauthorized access');
            }

            const token = authHeader.split(' ')[1];

            jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
                if (err) {
                    return res.status(403).send({ message: 'forbidden access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        // Use aggregate to query multiple collection and then merge data

        app.get('/getAppointmentOptions', async (req, res) => {
            const date = req.query.date;
            // console.log(date);
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

            // app.get('/v2/getAppointmentOptions', async (req, res) => {
            //     const date = req.query.date;
            //     const options = await appointmentOptionCollection.aggregate([
            //         {
            //             $lookup: {
            //                 from: 'bookings',
            //                 localField: 'name',
            //                 foreignField: 'treatment',
            //                 pipeline: [
            //                     {
            //                         $match: {
            //                             $expr: {
            //                                 $eq: ['$apointmentDate', date]
            //                             }
            //                         }
            //                     }
            //                 ],
            //                 as: 'booked'
            //             }
            //         },
            //         {
            //             $project: {
            //                 name: 1,
            //                 slots: 1,
            //                 booked: {
            //                     $map: {
            //                         input: '$booked',
            //                         as: 'book',
            //                         in: '$book.slot'
            //                     }
            //                 }
            //             }
            //         },
            //         {
            //             $project: {
            //                 name: 1,
            //                 slots: {
            //                     $setDifference: ['$slots', '$booked']
            //                 }
            //             }
            //         }
            //     ]).toArray();
            //     res.send(options);
            // })

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

        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const query = {
                appointmentDate: booking.appointmentDate,
                email: booking.email,
                treatment: booking.treatment
            }

            const alreadyBooked = await bookingsCollection.find(query).toArray();

            if (alreadyBooked.length) {
                const message = `You already have an appointment of ${booking.appointmentDate} `
                return res.send({ acknowledge: false, message })
            }
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })



        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({ accessToken: token });
            }
            console.log(user);
            res.status(403).send({ accessToken: 'PEEKABOOOOOOOOOOOOOOOOOOOOOOO!' });
        })



        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })



        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
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

