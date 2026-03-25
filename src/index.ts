import PostalMime from "postal-mime";

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

export default {
  async email(message: ForwardableEmailMessage, env: Env) {
    const parsed = await PostalMime.parse(await new Response(message.raw).arrayBuffer());

    const date = new Date().toISOString().slice(0, 10);
    const subject = (parsed.subject ?? "Invoice").trim();

    await env.DB.prepare(
      `INSERT OR IGNORE INTO sheet (id, columns_json)
       VALUES (1, '["Date","Description","Amount (NZD)","GST","Notes"]')`
    ).run();

    const { results: orderRes } = await env.DB.prepare(
      `SELECT COALESCE(MAX(row_order), 0) + 1 AS next FROM sheet_rows WHERE sheet_id = 1`
    ).all();
    const rowOrder = (orderRes[0] as any).next ?? 1;

    const rowData = JSON.stringify([date, subject, "", "", "📧 emailed invoice"]);
    const insertResult = await env.DB.prepare(
      `INSERT INTO sheet_rows (sheet_id, row_order, data_json) VALUES (1, ?, ?)`
    ).bind(rowOrder, rowData).run();
    const rowId = insertResult.meta.last_row_id as number;

    for (const att of parsed.attachments ?? []) {
      if (!ALLOWED_TYPES.includes(att.mimeType)) continue;

      const safeName = (att.filename ?? "attachment").replace(/[^a-zA-Z0-9._-]/g, "_");
      const r2Key = `invoices/${rowId}/${Date.now()}_${safeName}`;

      await env.R2.put(r2Key, att.content, {
        httpMetadata: { contentType: att.mimeType },
      });

      await env.DB.prepare(
        `INSERT INTO ledger_files (ledger_id, filename, r2_key) VALUES (?, ?, ?)`
      ).bind(rowId, att.filename ?? safeName, r2Key).run();
    }
  },
} satisfies ExportedHandler<Env>;
