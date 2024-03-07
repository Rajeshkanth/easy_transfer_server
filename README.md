Payment Transaction Alert Server
This Node.js server application is designed to receive payment transaction alerts from various sources and provide users with the ability to confirm or cancel payments. The confirmed or canceled payments will reflect on the website's Easy Transfer page.

### Features

Receive payment transaction alerts from `Easy Transfer` website.
Allow users to confirm or cancel payments.
Reflect confirmed or canceled payments on the website's Easy Transfer page.

### Technologies Used

`Node.js`: The server-side JavaScript runtime environment.
`Express.js`: A web application framework for Node.js.
`Socket.io & Polling`: Enables real-time, bidirectional communication between clients and the server.
`MongoDB`: A NoSQL database used to store payment transaction details.
`ejs`: A view engine for building user interfaces.
`HTML/CSS`: For structuring and styling the web pages.
`JavaScript`: Used for client-side scripting and interactions.

### Installation

Clone the repository from GitHub Repository Link.
Install `Node.js` and `npm` if not already installed on your system.
Navigate to the project directory and run `npm install` to install dependencies.
Configure the environment variables as required for database connections, API keys, etc.
It has two configurations one runs based on socket connection and other is polling connection.

### Run command

Start the server by running `npm start` to use the polling connection.
Start the server by running `npm run start:socket` to use the socket connection.
Access the application through the specified port.

### Usage

Payment Transaction Alert Submission:

External sources can submit payment transaction alerts to the server.
The server validates and stores the received alerts in the MongoDB database.

### User Interaction:

Users can access the Easy Transfer page on the website.
They can view pending payment transactions and choose to confirm or cancel them.

### Real-time Updates:

User can login to their respective account registered in `Easy Transfer` website here and able to receive the payment alerts for validations.

`Socket.io/Polling` enables real-time updates on the Easy Transfer page.
When a user confirms or cancels a payment, the page reflects the changes instantly to the payment initiated site.
