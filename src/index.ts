import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./services/auth/auth.routes.js";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  console.log("Hello");
  res.json({ message: "faxai server is running" });
});

app.use("/auth", authRoutes);

//Middleware d'erreur global
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
