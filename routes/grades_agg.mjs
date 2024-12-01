import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";

const router = express.Router();

/**
 * It is not best practice to seperate these routes
 * like we have done here. This file was created
 * specifically for educational purposes, to contain
 * all aggregation routes in one place.
 */

/**
 * Grading Weights by Score Type:
 * - Exams: 50%
 * - Quizes: 30%
 * - Homework: 20%
 */
//The number of learners with a weighted average (as calculated by the existing routes) higher than 70%
router.get("/stats", async(req,res)=>{
  try{
    
  let collection = await db.collection("grades");
  let result = await collection
    .aggregate([

      {
        $unwind: { path: "$scores" },
      },
      {
        $group: {
          _id: "$student_id",
          quiz: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "quiz"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          exam: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "exam"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          homework: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "homework"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          learner_id:"$_id",
          avg: {
            $sum: [
              { $multiply: [{ $avg: "$exam" }, 0.5] },
              { $multiply: [{ $avg: "$quiz" }, 0.3] },
              { $multiply: [{ $avg: "$homework" }, 0.2] },
            ],
          },
        },
      },
     {
          $match : {
            avg:{$gte:70},
          },
      },
    
  
    ])
    .toArray();
    console.log(result)
  const totalLeaners = (await collection.distinct("student_id")).length;
  const learnersAbove70 = result.length;
  const percentageAbove70 = (learnersAbove70/totalLeaners)*100;

  res.status(200).json({ totalLeaners,percentageAbove70,learnersAbove70 }
  );

  }catch(error){
    console.log("Error:",error);
   res.status(200).json({error:"Error:Item(s) not found" });
  }
  
  
    
});

//Create a GET route at /grades/stats/:id - learners within a class that has a class_id equal to the specified :id.

router.get("/stats/:id", async(req,res)=>{
  try{
  const class_id = parseInt(req.params.id);
  let collection = await db.collection("grades");
  let result = await collection
    .aggregate([
      {
        $match : {
          class_id:class_id
        },
    },

      {
        $unwind: { path: "$scores" },
      },
      {
        $group: {
          _id: "$student_id",
          quiz: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "quiz"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          exam: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "exam"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          homework: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "homework"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          learner_id:"$_id",
          avg: {
            $sum: [
              { $multiply: [{ $avg: "$exam" }, 0.5] },
              { $multiply: [{ $avg: "$quiz" }, 0.3] },
              { $multiply: [{ $avg: "$homework" }, 0.2] },
            ],
          },
        },
      },
    
      {
        $match : {
          avg:{$gte:70},
        },
    },
  
    ])
    .toArray();
    console.log(result)
  const totalLeaners = (await collection.distinct("student_id",{class_id:class_id})).length;
  const learnersAbove70 = result.length;
  const percentageAbove70 = (learnersAbove70/totalLeaners)*100;

  res.status(200).json({ totalLeaners,percentageAbove70,learnersAbove70 }
  );

  }catch(error){
    console.log("Error:",error);
   res.status(200).json({error:"Error:Item(s) not found" });
  }
});

async function indexes() {
  await db.collection("grades").createIndex({ "student_id": 1 });
  await db.collection("grades").createIndex({ "class_id": 1 })
}
async function compoundedIndexes() {
  await db.collection("grades").createIndex({ "student_id": 1 , "class_id": 1 });
  
}
await indexes();
await compoundedIndexes();
//validation rules on the grades collection
db.runCommand( {
  collMod:"grades",
  validator: {
     $jsonSchema: {
        bsonType: "object",
        title: "Student Object Validation",
        required: [  "class_id","student_id" ],
        properties: {
          
           class_id: {
              bsonType: "int",
              minimum: 0,
              maximum: 300,
              description: "'class_id' must be an integer in [ 0, 300 ] and is required"
           },
           student_id: {
              bsonType:"int",
              minimum: 0, 
              description: "'student_id' must be an integer greater or equal to [ 0 ] and is required"
           }
        }
     }
  },
  validationAction:"warn"
  
} )
export default router;