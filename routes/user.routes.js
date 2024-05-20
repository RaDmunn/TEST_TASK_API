import { Router } from "express";
import multer from "multer";
import UserController from "../controller/user.controller.js";

const router = new Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/register", upload.single("photo"), UserController.createUser);
router.get("/users", UserController.getUsers);
router.get("/users/:id", UserController.getUserById);
router.get("/positions", UserController.getUsersPositions);
router.get("/token", UserController.getUserToken);
router.get("/", UserController.getPage);
router.post("/generate", UserController.generateUsers);
router.get("/deleteUsers", UserController.deleteUsers);

export default router;
