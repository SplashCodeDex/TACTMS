import{G as E,t as o}from"./index-C0VftjXC.js";const A="gemini-2.5-pro",N={type:o.ARRAY,items:{type:o.OBJECT,properties:{"No.":{type:o.NUMBER,description:"The sequential number from the book row."},Name:{type:o.STRING,description:"The full name of the tither as written."},Amount:{type:o.NUMBER,description:"The specific amount recorded in the target month/week column. Use 0 if the cell is blank."},Confidence:{type:o.NUMBER,description:"A score from 0.0 to 1.0 indicating confidence in the legibility and extraction of this row."}},required:["No.","Name","Amount","Confidence"]}},C=async(a,i,t,e,s)=>{var p;if(!i)throw new Error("API Key is missing");if((!t||!e||!s)&&(t||e))throw new Error("Month, Week, and Date are required for a focused extraction.");const f=new E(i).getGenerativeModel({model:A}),y=await I(a),w=`
    Analyze the provided image of the 'THE APOSTOLIC CHURCH GHANA, TITHES REGISTER' for the year 2025.

    Extract data into a JSON array that strictly conforms to the provided schema.

    ${t&&e?`
    *** CRITICAL INSTRUCTION ***
    Focus ONLY on the column for: ${t.toUpperCase()} -> ${e.replace("Week ","")}.

    1. Find the row for each member.
    2. Extract the "Name" from the name column.
    3. Extract the "Amount" value SPECIFICALLY from the target column.
    4. If the amount cell is completely empty or has a dash (-), use 0 for the amount.
    5. Ignore amounts from other columns.
    `:`
    Extract the "Name" and "Amount" from the visible columns.
    `}

    6. Return ONLY the JSON array structure required by the schema.
  `,m=3;let n=0,h;for(;n<m;)try{h=await f.generateContent({contents:[{role:"user",parts:[{text:w},y]}],generationConfig:{responseMimeType:"application/json",responseSchema:N}});break}catch(r){if(n++,console.warn(`Gemini API attempt ${n} failed:`,r),n>=m)throw(p=r.message)!=null&&p.includes("429")?new Error("Service is busy (Rate Limit Exceeded). Please try again in a minute."):new Error(`Failed to process image after ${m} attempts. Please check your internet connection.`);const d=Math.pow(2,n-1)*1e3;await new Promise(u=>setTimeout(u,d))}if(!h)throw new Error("Unexpected error: No result from AI model.");try{const r=h.response.text().trim();return JSON.parse(r).map((c,T)=>({"No.":c["No."]||T+1,"Transaction Type":"Individual Tithe-[Income]","Payment Source Type":"Registered Member","Membership Number":c.Name,"Transaction Date ('DD-MMM-YYYY')":s||new Date().toDateString(),Currency:"GHS","Exchange Rate":1,"Payment Method":"Cash","Transaction Amount":c.Amount||0,"Narration/Description":`Tithe for ${s||"Unknown Date"}`,Confidence:c.Confidence||.5}))}catch(r){throw console.error("Error parsing Gemini response:",r),new Error("Failed to parse AI response. The image might be too blurry or contain unexpected data.")}};async function I(a){return new Promise((i,t)=>{const e=new FileReader;e.onloadend=()=>{const l=e.result.split(",")[1];i({inlineData:{data:l,mimeType:a.type}})},e.onerror=t,e.readAsDataURL(a)})}export{C as processTitheImage};
