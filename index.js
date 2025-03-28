import express from 'express';
import pg from 'pg';
import cors from 'cors';
import axios from 'axios';

const app = express();
const port = 4000;

app.use(cors())
app.use(express.json());

const pool = new pg.Pool({
	user:'admin',
	host:'localhost',
	database:'cfprice',
	password:'admin',
	port:5432,
	});

app.post('/leads', async (req, res) => {
    const { nombre, numero, correo, modelo, precio, enganche, plazo, mensualidad, apellido, estado } = req.body;
	const nombreCompleto = `${nombre} ${apellido}`;
    try {
        // Guardar en la base de datos
        const result = await pool.query(
            'INSERT INTO lead (nombre, numero, correo, modelo, precio, enganche, plazo, mensualidad, apellido, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [nombre, numero, correo, modelo, precio, enganche, plazo, mensualidad, apellido, estado]
        );

        // Construir el JSON para enviar a Odoo
        const leadOdoo = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "object",
                method: "execute_kw",
                args: [
                    "shkappta-gyg-gygautomotriz-12693012",
                    2,  // ID del usuario (cámbialo si es otro)
                    "666ec74e557592a065d440ef78180109a7c90d54", // API Key de Odoo
                    "crm.lead",
                    "create",
                    [
                        {
			    "contact_name": `${nombre} ${apellido}`,
                            "phone": numero,
                            "email_from": correo,
                            "expected_revenue": precio,
				"state_id": estado,
                            "name": `Financiamiento - ${modelo} | Enganche: $${enganche} | Plazo: ${plazo} meses | Mensualidad: $${mensualidad}`,
                            "type": "opportunity"
                        }
                    ]
                ]
            },
            id: 1
        };

        // Enviar el Lead a Odoo
        const response = await axios.post("https://gygautomotriz.odoo.com/jsonrpc", leadOdoo, {
            headers: { "Content-Type": "application/json" }
        });

        console.log("Respuesta de Odoo:", response.data);

        res.status(201).json({ lead: result.rows[0], odoo_response: response.data });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Error al insertar en la base de datos o en Odoo" });
    }
});


app.listen(4000, () => {console.log('server listening on port 4000');});
