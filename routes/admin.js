const express = require("express");
const router = express.Router();
const middleware = require("../middleware/index.js");

const mongoose = require("mongoose");
const User = require("../models/user.js");
const Donation = require("../models/donation.js");


router.get("/admin/dashboard", middleware.ensureAdminLoggedIn, async (req,res)=>{
  try {
    const [
      numAdmins,
      numAgents,
      numDonors,
      numPendingDonations,
      numAcceptedDonations,
      numAssignedDonations,
      numCollectedDonations,
      weeklyTrendData
    ] = await Promise.all([
      User.countDocuments({ role:"admin" }),
      User.countDocuments({ role:"agent" }),
      User.countDocuments({ role:"donor" }),
      Donation.countDocuments({ status:"pending" }),
      Donation.countDocuments({ status:"accepted" }),
      Donation.countDocuments({ status:"assigned" }),
      Donation.countDocuments({ status:"collected" }),
      getWeeklyTrendData()
    ]);

    res.render("admin/dashboard",{
      numAdmins,
      numAgents,
      numDonors,
      numPendingDonations,
      numAcceptedDonations,
      numAssignedDonations,
      numCollectedDonations,
      weeklyTrendData // always defined
    });
  } catch(e){
    console.error("Error loading dashboard:", e);
    res.render("admin/dashboard",{
      numAdmins:0,
      numAgents:0,
      numDonors:0,
      numPendingDonations:0,
      numAcceptedDonations:0,
      numAssignedDonations:0,
      numCollectedDonations:0,
      weeklyTrendData:{ days:[], counts:{ collected:[], assigned:[] } }
    });
  }
});

// Helper function to get weekly trend data
async function getWeeklyTrendData(){
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(today);
    start.setDate(start.getDate()-6); // 7-day window including today

    // Fetch donations created in window using ObjectId timestamp
    const startObjectId = mongoose.Types.ObjectId.createFromTime(Math.floor(start.getTime()/1000));
    const recent = await Donation.find({ _id: { $gte: startObjectId } }).select("status _id");

    const days = [];
    const dayMap = {}; // key: YYYY-MM-DD -> index
    for(let i=0;i<7;i++){
      const d = new Date(start);
      d.setDate(start.getDate()+i);
      const key = d.toISOString().slice(0,10);
      days.push(d.toLocaleDateString('en-US',{ weekday:'short'}));
      dayMap[key]=i;
    }

    const counts = {
      collected: Array(7).fill(0),
      assigned: Array(7).fill(0),
      accepted: Array(7).fill(0),
      pending: Array(7).fill(0)
    };

    recent.forEach(doc=>{
      const ts = doc._id.getTimestamp();
      ts.setHours(0,0,0,0);
      const key = ts.toISOString().slice(0,10);
      if(dayMap[key] !== undefined && counts[doc.status]){
        counts[doc.status][dayMap[key]]++;
      }
    });

    return { days, counts };
  } catch(err){
    console.error("Weekly trend calc error:", err);
    return { days:[], counts:{ collected:[], assigned:[], accepted:[], pending:[] } };
  }
}

router.get("/admin/donations/pending", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const pendingDonations = await Donation.find({status: ["pending", "accepted", "assigned"]}).populate("donor");
		res.render("admin/pendingDonations", { title: "Pending Donations", pendingDonations });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get('/admin/agents/:id/feedback', middleware.ensureAdminLoggedIn, async (req, res) => {
    try {
        const agentId = req.params.id;
        
        // Find donations with feedback for this agent
        const donations = await Donation.find({
            'agent': agentId,
            'status': 'collected',
            'feedback.rating': { $ne: null }
        }).populate('donor', 'firstName lastName').sort({ 'feedback.submittedAt': -1 });
        
        // Calculate statistics
        let totalRating = 0;
        const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        
        donations.forEach(donation => {
            totalRating += donation.feedback.rating;
            ratingCounts[donation.feedback.rating]++;
        });
        
        const avgRating = donations.length > 0 ? (totalRating / donations.length).toFixed(1) : 0;
        
        res.json({
            success: true,
            feedback: donations.map(d => ({
                id: d._id,
                donor: `${d.donor.firstName} ${d.donor.lastName}`,
                rating: d.feedback.rating,
                comment: d.feedback.comment,
                date: d.feedback.submittedAt
            })),
            stats: {
                avgRating,
                total: donations.length,
                ratingCounts
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error fetching agent feedback' });
    }
});

router.get("/admin/donations/previous", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const previousDonations = await Donation.find({ status: "collected" }).populate("donor");
		res.render("admin/previousDonations", { title: "Previous Donations", previousDonations });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/admin/donation/view/:donationId", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		const donation = await Donation.findById(donationId).populate("donor").populate("agent");
		res.render("admin/donation", { title: "Donation details", donation });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/admin/donation/accept/:donationId", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		await Donation.findByIdAndUpdate(donationId, { status: "accepted" });
		req.flash("success", "Donation accepted successfully");
		res.redirect(`/admin/donation/view/${donationId}`);
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/admin/donation/reject/:donationId", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		await Donation.findByIdAndUpdate(donationId, { status: "rejected" });
		req.flash("success", "Donation rejected successfully");
		res.redirect(`/admin/donation/view/${donationId}`);
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/admin/donation/assign/:donationId", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		const agents = await User.find({ role: "agent" });
		const donation = await Donation.findById(donationId).populate("donor");
		res.render("admin/assignAgent", { title: "Assign agent", donation, agents });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.post("/admin/donation/assign/:donationId", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		const {agent, adminToAgentMsg} = req.body;
		await Donation.findByIdAndUpdate(donationId, { status: "assigned", agent, adminToAgentMsg });
		req.flash("success", "Agent assigned successfully");
		res.redirect(`/admin/donation/view/${donationId}`);
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/admin/agents", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const agents = await User.find({ role: "agent" });
		res.render("admin/agents", { title: "List of agents", agents });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});


router.get("/admin/profile", middleware.ensureAdminLoggedIn, (req,res) => {
	res.render("admin/profile", { title: "My profile" });
});

router.put("/admin/profile", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const id = req.user._id;
		const updateObj = req.body.admin;	// updateObj: {firstName, lastName, gender, address, phone}
		await User.findByIdAndUpdate(id, updateObj);
		
		req.flash("success", "Profile updated successfully");
		res.redirect("/admin/profile");
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
	
});


module.exports = router;