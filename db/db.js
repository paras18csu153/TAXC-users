const url = process.env.DB_URL;

const mongoose = require("mongoose");

function db() {
    // Connecting to Database
    mongoose
        .connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        .then(() => {
            console.log("Successfully connected to the database......HURRAAAAYY!!!");
        })
        .catch((err) => {
            console.log(
                "Oh No!!!! Could not connect to the database. Exiting now...\n", err
            );
            process.exit();
        });
}

module.exports = db;