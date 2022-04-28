const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const MongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
var nodemailer = require("nodemailer");

require("dotenv").config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
// app.use(express.static('Rooms'));
app.use(fileUpload());
app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	next();
});

const port = 5000;
const uri =
	"mongodb+srv://abid:2a9KdKtmumDF98ij@cluster0.ytswv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

client.connect((err) => {
	// Database collections
	const UsersCollections = client.db("iFarmer").collection("users");
	const SeedCollections = client.db("iFarmer").collection("seed_bank");
	const CropCollections = client.db("iFarmer").collection("ecommerce");
	const UpcomingCollections = client
		.db("iFarmer")
		.collection("upcoming_product");
	const PrebookCollections = client.db("iFarmer").collection("prebook");
	const OrderCollections = client.db("iFarmer").collection("orders");
	const ForumCollections = client.db("iFarmer").collection("forum");
	const BlogCollections = client.db("iFarmer").collection("Blog");
	const TempUsersOTPCollections = client
		.db("iFarmer")
		.collection("tempUsersOTP");

	//User &  Authentication block starts
	app.post("/send_otp_for_user_reg", (req, res) => {
		const email = req.body.email;
		const OTP = Math.ceil(Math.random() * 1000000);
		TempUsersOTPCollections.find({ email }).toArray((err, documents) => {
			if (!documents.length) {
				TempUsersOTPCollections.insertOne({ email, OTP })
				.then(result => {
				    res.send({ isSuccess: result.modifiedCount > 0 })
				})
				var transporter = nodemailer.createTransport({
					service: "gmail",
					auth: {
						user: "hosainabid01@gmail.com",
						pass: "ebekdrluxrykbgvu",
					},
				});

				var mailOptions = {
					from: "hosainabid01@gmail.com",
					to: email,
					subject: "Two factor authentication",
					text: `Hello there! Your OTP is: ${OTP}`,
				};

				transporter.sendMail(mailOptions, function (error, info) {
					if (error) {
						console.log(error);
						res.send(error);
					} else {
						res.send({ result: info.response });
						console.log("Email sent: " + info.response);
					}
				});
			} else {
				TempUsersOTPCollections
					.updateOne(
						{ email },
						{
							$set: { OTP },
						}
					).then((result) => {
						res.send({ isSuccess: result?.modifiedCount > 0 });
					});
				var transporter = nodemailer.createTransport({
					service: "gmail",
					auth: {
						user: "hosainabid01@gmail.com",
						pass: "ebekdrluxrykbgvu",
					},
				});

				var mailOptions = {
					from: "hosainabid01@gmail.com",
					to: email,
					subject: "Two factor authentication",
					text: `Hello there! Your OTP is: ${OTP}`,
				};

				transporter.sendMail(mailOptions, function (error, info) {
					if (error) {
						console.log(error);
						res.send(error);
					} else {
						res.send({ result: info.response });
						console.log("Email sent: " + info.response);
					}
				});
			}
		});
	});
	app.post("/validate_OTP_before_reg", (req, res) => {
		const email = req.body.email;
		const OTP = req.body.OTP;
		TempUsersOTPCollections.find({ email, OTP }).toArray((err, documents) =>
			documents.length
				? res.send({ isSuccess: true, message: "OTP is correct" })
				: res.send({ isSuccess: false, message: "OTP is incorrect" })
		);
	});
	app.post("/user_registration", (req, res) => {
		const email = req.body.email;
		const OTP = Math.ceil(Math.random() * 1000000);
		const file = req.files.file;
		const newImg = file.data;
		const encImg = newImg.toString("base64");
		var image = {
			contentType: file.mimetype,
			size: file.size,
			img: Buffer.from(encImg, "base64"),
		};

		UsersCollections.find({ email }).toArray((err, documents) =>
			// console.log(documents)
			documents.length
				? res.send({
						isSuccess: false,
						message: "User is already registered",
				  })
				: UsersCollections.insertOne({
						...req.body,
						image,
						balance: 0,
				  }).then((response) =>
						res.send({
							isSuccess: true,
							message: "User registered successfully",
						})
				  )
		);
	});
	app.post("/delete_user", (req, res) => {
		const _id = req.body.id;
		UsersCollections
			.deleteOne({ _id: ObjectID(_id) })
			.then((result) => {
				res.send({ isSuccess: result.deletedCount > 0 });
			})
			.catch((err) => console.log({err}));
	});
	app.post("/update_user_balance", (req, res) => {
		const _id = req.body.id;
		const balance = req.body.balance;

		UsersCollections.updateOne(
			{ _id: ObjectID(_id) },
			{
				$set: { balance },
			}
		).then((result) => {
			res.send({ isSuccess: result.modifiedCount > 0 });
		});
	});
	app.post("/update_user_profile", (req, res) => {
		const _id = req.body.id;
		const file = req?.files?.file;
		const newImg = file?.data;
		const encImg = newImg?.toString("base64");
		var image = {
			contentType: file?.mimetype,
			size: file?.size,
			img: encImg && Buffer.from(encImg, "base64"),
		};

		if (encImg) {
			UsersCollections.updateOne(
				{ _id: ObjectID(_id) },
				{
					$set: { ...req.body, image },
				}
			).then((result) => {
				if (result.modifiedCount > 0) {
					UsersCollections.find({ _id: ObjectID(_id), email: req.body.email }).toArray((err, documents) =>
						documents.length
							? res.send({
								isSuccess: true,
								role: documents[0].role,
								user_info: documents.map((x) => {
									delete x.password;
									delete x.OTP;
									return x;
								})[0]})
							: res.send({
								isSuccess: false,
								message:
									"User is not registered",
								}));
					} else {
						res.send({
							isSuccess: false,
							message:
								"Something went wrong!",
							})
					}
				}
			);			
		} else {
			UsersCollections.updateOne(
				{ _id: ObjectID(_id) },
				{
					$set: { ...req.body },
				}
			).then((result) => {
				if (result.modifiedCount > 0) {
					UsersCollections.find({ _id: ObjectID(_id), email: req.body.email }).toArray((err, documents) =>
						documents.length
							? res.send({
								isSuccess: true,
								role: documents[0].role,
								user_info: documents.map((x) => {
									delete x.password;
									delete x.OTP;
									return x;
								})[0]})
							: res.send({
								isSuccess: false,
								message:
									"User is not registered",
								}));
					} else {
						res.send({
							isSuccess: false,
							message:
								"Something went wrong!",
							})
					}
				}
			);
		}
	});
	app.post("/make_admin", (req, res) => {
		const _id = req.body.id;
		UsersCollections.updateOne(
			{ _id: ObjectID(_id) },
			{
				$set: { role: req.body.role },
			}
		).then((result) => {
			res.send({ isSuccess: result.modifiedCount > 0 });
		});
	});
	app.post("/login", (req, res) => {
		const email = req.body.email;
		const password = req.body.password;

		UsersCollections.find({ email, password }).toArray((err, documents) =>
			documents.length
				? res.send({
						isSuccess: true,
						message: "Login success",
						role: documents[0].role,
						user_info: documents.map((x) => {
							delete x.password;
							delete x.OTP;
							return x;
						})[0],
				  })
				: res.send({
						isSuccess: false,
						message:
							"User is not registered or password is incorrect",
				  })
		);
	});
	app.post("/set_new_password", (req, res) => {
		const email = req.body.email;
		const password = req.body.newPassword;

		UsersCollections.updateOne(
			{ email },
			{
				$set: { password },
			}
		).then((result) => {
			res.send({ isSuccess: result.modifiedCount > 0 });
		});
	});
	app.post("/forget_password", (req, res) => {
		const email = req.body.email;
		const OTP = Math.ceil(Math.random() * 1000000);
		UsersCollections.find({ email }).toArray((err, documents) => {
			if (documents.length) {
				UsersCollections.updateOne(
					{ email },
					{
						$set: { OTP },
					}
				).then((result) => {
					res.send({ isSuccess: result.modifiedCount > 0 });
				});
				var transporter = nodemailer.createTransport({
					service: "gmail",
					auth: {
						user: "hosainabid01@gmail.com",
						pass: "ebekdrluxrykbgvu",
					},
				});

				var mailOptions = {
					from: "hosainabid01@gmail.com",
					to: email,
					subject: "Two factor authentication",
					text: `Your OTP is: ${OTP}`,
				};

				transporter.sendMail(mailOptions, function (error, info) {
					if (error) {
						console.log(error);
						res.send(error);
					} else {
						res.send({ result: info.response });
						console.log("Email sent: " + info.response);
					}
				});
			} else {
				res.send({
					isSuccess: false,
					message: "User is not registered",
				});
			}
		});
	});
	app.post("/validate_OTP", (req, res) => {
		const email = req.body.email;
		const OTP = req.body.OTP;
		UsersCollections.find({ email, OTP }).toArray((err, documents) =>
			documents.length
				? res.send({ isSuccess: true, message: "OTP is correct" })
				: res.send({ isSuccess: false, message: "OTP is incorrect" })
		);
	});
	app.get("/users", (req, res) => {
		// res.send('users');
		UsersCollections.find({}).toArray((err, documents) =>
			res.send(
				documents.map((x) => {
					delete x.password;
					delete x.OTP;
					return x;
				})
			)
		);
	});
	//User &  Authentication block ends

	// seed  bank block starts
	app.post("/add_new_seed", (req, res) => {
		const name = req.body.name;
		const category = req.body.category;
		const stock = req.body.stock;
		const price = req.body.price;
		const quantity = req.body.quantity;

		const file = req.files.file;
		const newImg = file.data;
		const encImg = newImg.toString("base64");
		var image = {
			contentType: file.mimetype,
			size: file.size,
			img: Buffer.from(encImg, "base64"),
		};

		SeedCollections.insertOne({ ...req.body, image }).then((response) =>
			res.send({ isSuccess: true, message: "seed is successfully added" })
		);
	});

	app.get("/all_seeds", (req, res) => {
		SeedCollections.find({}).toArray((err, documents) =>
			res.send(documents)
		);
	});

	app.post("/delete_seed", (req, res) => {
		const _id = req.body.id;
		SeedCollections.deleteOne({ _id: ObjectID(_id) }).then((result) => {
			res.send({ isSuccess: result.deletedCount > 0 });
		});
	});

	app.post("/update_seed_info", (req, res) => {
		const _id = req.body.id;
		const name = req.body.name;
		const category = req.body.category;
		const stock = req.body.stock;
		const price = req.body.price;
		const quantity = req.body.quantity;

		SeedCollections.updateOne(
			{ _id: ObjectID(_id) },
			{
				$set: { ...req.body },
			}
		).then((result) => {
			res.send({ isSuccess: result.modifiedCount > 0 });
		});
	});
	// seed  bank block ends

	// CROPS block starts
	app.post("/add_new_crop", (req, res) => {
		const name = req.body.name;
		const category = req.body.category;
		const stock = req.body.stock;
		const quantity = req.body.quantity;

		const file = req.files.file;
		const newImg = file.data;
		const encImg = newImg.toString("base64");
		const image = {
			contentType: file.mimetype,
			size: file.size,
			img: Buffer.from(encImg, "base64"),
		};

		CropCollections.insertOne({ ...req.body, image }).then((response) =>
			res.send({ isSuccess: true, message: "crop is successfully added" })
		);
	});

	app.get("/all_crops", (req, res) => {
		CropCollections.find({}).toArray((err, documents) =>
			res.send(documents)
		);
	});

	app.post("/delete_crop", (req, res) => {
		const _id = req.body.id;
		CropCollections.deleteOne({ _id: ObjectID(_id) }).then((result) => {
			res.send({ isSuccess: result.deletedCount > 0 });
		});
	});

	app.post("/update_crop_info", (req, res) => {
		const _id = req.body.id;
		const name = req.body.name;
		const category = req.body.category;
		const stock = req.body.stock;
		const quantity = req.body.quantity;

		CropCollections.updateOne(
			{ _id: ObjectID(_id) },
			{
				$set: { ...req.body },
			}
		).then((result) => {
			res.send({ isSuccess: result.modifiedCount > 0 });
		});
	});
	// CROPS  bank block ends

	// Upcoming Collections block starts
	app.post("/add_new_upcoming_product", (req, res) => {
		const file = req.files.file;
		const newImg = file.data;
		const encImg = newImg.toString("base64");
		const image = {
			contentType: file.mimetype,
			size: file.size,
			img: Buffer.from(encImg, "base64"),
		};

		UpcomingCollections.insertOne({ ...req.body, image }).then((response) =>
			res.send({
				isSuccess: true,
				message: "product is successfully added",
			})
		);
	});

	app.get("/all_upcoming_products", (req, res) => {
		UpcomingCollections.find({}).toArray((err, documents) =>
			res.send(documents)
		);
	});

	app.post("/delete_upcoming_product", (req, res) => {
		const _id = req.body.id;
		UpcomingCollections.deleteOne({ _id: ObjectID(_id) }).then((result) => {
			res.send({ isSuccess: result.deletedCount > 0 });
		});
	});

	app.post("/update_upcoming_product_info", (req, res) => {
		const _id = req.body.id;

		UpcomingCollections.updateOne(
			{ _id: ObjectID(_id) },
			{
				$set: { ...req.body },
			}
		).then((result) => {
			res.send({ isSuccess: result.modifiedCount > 0 });
		});
	});
	//Upcoming Collections  block ends

	//Prebook Collections  block starts
	app.get("/all_prebookings", (req, res) => {
		// res.send('users');
		PrebookCollections.find({}).toArray((err, documents) =>
			res.send(documents)
		);
	});
	app.post("/prebook", (req, res) => {
		PrebookCollections.insertOne({ ...req.body }).then((response) =>
			res.send({ isSuccess: true, message: "prebooking success" })
		);
	});
	//Prebook Collections  block ends

	//Order Collections  block starts
	app.get("/order_lists", (req, res) => {
		OrderCollections.find({}).toArray((err, documents) =>
			res.send(documents)
		);
	});
	app.post("/place_order", (req, res) => {
		OrderCollections.insertOne({ ...req.body, cancel_reason: "" }).then(
			(response) =>
				res.send({
					isSuccess: true,
					message: "order successfully placed",
				})
		);
	});
	app.post("/order_status_update", (req, res) => {
		const _id = req.body.id;
		const status = req.body.status;
		const cancel_reason = req.body.cancel_reason;

		OrderCollections.updateOne(
			{ _id: ObjectID(_id) },
			{
				$set: { status, cancel_reason },
			}
		).then((result) => {
			res.send({ isSuccess: result.modifiedCount > 0 });
		});
	});
	//Order Collections  block ends

	//Forum Collections  block starts
	app.get("/all_forum_posts_with_comments", (req, res) => {
		ForumCollections.find({}).toArray((err, documents) =>
			res.send(documents)
		);
	});
	app.post("/post_forum", (req, res) => {
		const commments = req.body.commments;
		const file = req.files.file;
		const newImg = file.data;
		const encImg = newImg.toString("base64");
		const image = {
			contentType: file.mimetype,
			size: file.size,
			img: Buffer.from(encImg, "base64"),
		};

		ForumCollections.insertOne({ ...req.body, commments, image }).then(
			(response) =>
				res.send({ isSuccess: true, message: "post added to forum" })
		);
	});
	app.post("/add_comment_to_forum_post", (req, res) => {
		const _id = req.body.id;
		const commments = req.body.commments;

		ForumCollections.updateOne(
			{ _id: ObjectID(_id) },
			{
				$set: { commments },
			}
		).then((result) => {
			res.send({ isSuccess: result.modifiedCount > 0 });
		});
	});
	app.post("/delete_forum_post", (req, res) => {
		const _id = req.body.id;
		ForumCollections.deleteOne({ _id: ObjectID(_id) }).then((result) => {
			res.send({ isSuccess: result.deletedCount > 0 });
		});
	});
	app.post("/update_forum_post", (req, res) => {
		const _id = req.body.id;

		ForumCollections.updateOne(
			{ _id: ObjectID(_id) },
			{
				$set: { ...req.body },
			}
		).then((result) => {
			res.send({ isSuccess: result.modifiedCount > 0 });
		});
	});
	//Forum Collections  block ends

	//blog Collections  block starts
	app.get("/all_blog_posts_with_comments", (req, res) => {
		BlogCollections.find({}).toArray((err, documents) =>
			res.send(documents)
		);
	});
	app.post("/post_blog", (req, res) => {
		const commments = req.body.commments;
		const file = req.files.file;
		const newImg = file.data;
		const encImg = newImg.toString("base64");
		const image = {
			contentType: file.mimetype,
			size: file.size,
			img: Buffer.from(encImg, "base64"),
		};

		BlogCollections.insertOne({ ...req.body, commments, image }).then(
			(response) =>
				res.send({ isSuccess: true, message: "post added to blog" })
		);
	});
	app.post("/add_comment_to_blog_post", (req, res) => {
		const _id = req.body.id;
		const commments = req.body.commments;

		BlogCollections.updateOne(
			{ _id: ObjectID(_id) },
			{
				$set: { commments },
			}
		).then((result) => {
			res.send({ isSuccess: result.modifiedCount > 0 });
		});
	});
	app.post("/delete_blog_post", (req, res) => {
		const _id = req.body.id;
		BlogCollections.deleteOne({ _id: ObjectID(_id) }).then((result) => {
			res.send({ isSuccess: result.deletedCount > 0 });
		});
	});
	app.post("/update_blog_post", (req, res) => {
		const _id = req.body.id;

		BlogCollections.updateOne(
			{ _id: ObjectID(_id) },
			{
				$set: { ...req.body },
			}
		).then((result) => {
			res.send({ isSuccess: result.modifiedCount > 0 });
		});
	});
	//blog Collections  block ends
});

app.get("/", (req, res) => {
	res.send("Congratulations! server is  running");
});

app.listen(process.env.PORT || port);
