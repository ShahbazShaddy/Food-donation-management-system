const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema({
	donor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "users",
		required: true
	},
	agent: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "users",
	},
	foodType: {
		type: String,
		required: true
	},
	quantity: {
		type: String,
		required: true
	},
	cookingTime: {
		type: Date,
		required: true
	},
	address: {
		type: String,
		required: true
	},
	phone: {
    type: String,
    required: true,
    validate: {
        validator: function(v) {
            // Allow digits, spaces, plus sign, parentheses, and hyphens
            return /^[0-9 +()-]{7,}$/.test(v);
        },
        message: props => `${props.value} is not a valid phone number!`
    }
	},
	donorToAdminMsg: String,
	adminToAgentMsg: String,
	collectionTime: {
		type: Date,
	},
	status: {
		type: String,
		enum: ["pending", "rejected", "accepted", "assigned", "collected"],
		required: true
	},
	feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: null
        },
        comment: {
            type: String,
            default: null
        },
        submittedAt: {
            type: Date,
            default: null
        }
    },
});

const Donation = mongoose.model("donations", donationSchema);
module.exports = Donation;