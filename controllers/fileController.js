import { ApifyClient } from 'apify-client';
import ExcelJS from 'exceljs';
import pkg from 'pg';
const { Client } = pkg;

// Initialize the ApifyClient with API token
const client = new ApifyClient({
    token: 'apify_api_WwKXCAWqBDKCcVYBe9y4R2Ge2tNV8e3H0Ggc',
});

// Initialize PostgreSQL client
const dbClient = new Client({
    user: 'prajwal.pawar', // Replace with your DB user
    host: '192.168.1.39',     // Replace with your DB host if different
    database: 'LeadDB', // Replace with your DB name
    password: 'PPIndia@098', // Replace with your DB password
    port: 5432,            // Default PostgreSQL port
});

dbClient.connect(); // Connect to the database

// Controller function to process the uploaded file
export const processFileController = async (req, res) => {
    if (!req.files || !req.files.excelFile) {
        return res.status(400).send('No file uploaded.');
    }

    const uploadedFile = req.files.excelFile;
    const workbook = new ExcelJS.Workbook();

    try {
        await workbook.xlsx.load(uploadedFile.data);
        const worksheet = workbook.getWorksheet(1);
        const links = [];

        worksheet.eachRow((row) => {
            const link = row.getCell(1).text;
            if (link) links.push(link);
        });

        // Process links in batches of 5
        const results = [];
        const batchSize = 5;
        
        for (let i = 0; i < links.length; i += batchSize) {
            const batchLinks = links.slice(i, i + batchSize); // Get current batch of 5 links
            const batchResults = await Promise.all(batchLinks.map(fetchProfile)); // Fetch data for current batch
            results.push(...batchResults); // Collect all results from current batch
        }

        // Create a new workbook for output
        const outputWorkbook = new ExcelJS.Workbook();
        const outputWorksheet = outputWorkbook.addWorksheet('Processed Results');
        
        // Add header
        outputWorksheet.addRow([
            'Link', 'First Name', 'Last Name', 'Full Name', 'Address Country Only', 'Address With Country',
            'Company Name', 'Company Link', 'Job Title', 'Present Line', 'Address', 'Timestamp', 'Input URL', 'Output URL'
        ]);
        
        // Add rows with results
        results.forEach(result => {
            outputWorksheet.addRow([
                result.link, result.firstName, result.lastName, result.fullName, result.addressCountryOnly,
                result.addressWithCountry, result.companyName, result.companyLink1, result.jobTitle,
                result.presentLine, result.address, result.timestamp, result.inputUrl, result.outputUrl
            ]);
        });

        // Write output to a buffer and send it
        res.setHeader('Content-Disposition', 'attachment; filename=processed_results.xlsx');
        await outputWorkbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).send('Error processing file');
    }
};

// Function to fetch and process the LinkedIn profile data
async function fetchProfile(link) {
    try {
        const input = { link };
        const run = await client.actor('SXiKnp1qLCbVTMNKd').call(input, { memory: 256 });

        // Ensure the dataset is fetched correctly
        const datasetResponse = await client.dataset(run.defaultDatasetId).listItems();

        // Log the full JSON response from the API
        await logProfileData(link, datasetResponse); // Log the data into profile_data_logs

        if (!datasetResponse || !datasetResponse.items || datasetResponse.items.length === 0) {
            return createEmptyResult(link);
        }

        const profile = datasetResponse.items[0].data;
        if (!profile) {
            return createEmptyResult(link);
        }

        // Safely extract properties using optional chaining and default values
        const {
            firstName = '-',
            lastName = '-',
            fullName = '-',
            addressCountryOnly = '-',
            addressWithCountry = '-',
            experiences = []
        } = profile;

        let companyName = '-', companyLink1 = '-', jobTitle = '-', presentLine = '-', address = '-';

        if (experiences.length > 0) {
            const experience = experiences[0];
            if (experience) {
                const {
                    companyLink1: companyLink = '-',
                    title = '-',
                    subtitle = '-',
                    caption = '-',
                    metadata = '-',
                    subComponents = []
                } = experience;

                if (subComponents.length > 0 && subComponents[0]?.title && subComponents[0]?.caption) {
                    jobTitle = subComponents[0].title || '-';
                    presentLine = subComponents[0].caption || '-';
                    companyName = title || '-';
                    address = caption || '-';
                } else {
                    companyName = subtitle || '-';
                    jobTitle = title || '-';
                    presentLine = caption || '-';
                    address = metadata || '-';
                }

                companyLink1 = companyLink;
            }
        }

        const companyNameWithoutExtra = companyName.split(' ·')[0].trim();
        const addressWithoutExtra = address.split(' ·')[0].trim();

        const timestamp = `${companyName} ${jobTitle} ${presentLine} ${address}`;

        console.log(`Timestamp: ${timestamp}`);
        console.log(`Input URL: ${link}`);
        console.log(`Output Link: ${profile.publicIdentifier ? `https://www.linkedin.com/in/${profile.publicIdentifier}` : 'No public identifier'}`);

        const profileData = {
            link,
            firstName,
            lastName,
            fullName,
            addressCountryOnly,
            addressWithCountry,
            companyName: companyNameWithoutExtra,
            companyLink1, // Add companyLink1 to the return object
            jobTitle,
            presentLine,
            address: addressWithoutExtra,
            timestamp,
            inputUrl: link,
            outputUrl: profile.publicIdentifier ? `https://www.linkedin.com/in/${profile.publicIdentifier}` : '-',
        };

        // Insert the profile data into the apify_profile_data table
        await insertProfileData(profileData);

        return profileData;
    } catch (error) {
        console.error(`Error processing link ${link}:`, error.message);
        return createEmptyResult(link);
    }
}


// Function to log profile data into the database
async function logProfileData(link, datasetResponse) {
    const query = 'INSERT INTO profile_data_logs (link, dataset_response) VALUES ($1, $2)';
    const values = [link, JSON.stringify(datasetResponse)];

    try {
        await dbClient.query(query, values);
        console.log(`Logged data for link: ${link}`);
    } catch (err) {
        console.error('Error logging data to database:', err);
    }
}

// Function to insert profile data into the `public.apify_profile_data` table
async function insertProfileData(profileData) {
    const query = `
        INSERT INTO public.apify_profile_data (
            link, firstname, lastname, fullname, addresscountryonly, 
            addresswithcountry, companyname, companylink1, jobtitle, 
            presentline, address, "timestamp", inputurl, outputurl
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `;
    const values = [
        profileData.link,
        profileData.firstName,
        profileData.lastName,
        profileData.fullName,
        profileData.addressCountryOnly,
        profileData.addressWithCountry,
        profileData.companyName,
        profileData.companyLink1,
        profileData.jobTitle,
        profileData.presentLine,
        profileData.address,
        profileData.timestamp,
        profileData.inputUrl,
        profileData.outputUrl
    ];

    try {
        await dbClient.query(query, values);
        console.log(`Profile data inserted for link: ${profileData.link}`);
    } catch (err) {
        console.error('Error inserting profile data into database:', err);
    }
}

// Function to create an empty result when no data is found
function createEmptyResult(link) {
    return {
        link,
        firstName: '-',
        lastName: '-',
        fullName: '-',
        addressCountryOnly: '-',
        addressWithCountry: '-',
        companyName: '-',
        companyLink1: '-',
        jobTitle: '-',
        presentLine: '-',
        address: '-',
        timestamp: '-',
        inputUrl: link,
        outputUrl: '-'
    };
}
