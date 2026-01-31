import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class LogisticsLocationDurationAPIComparator {

    static class LocationRecord {
        String startDate, endDate, location;

        LocationRecord(String s, String e, String l) {
            this.startDate = s;
            this.endDate = e;
            this.location = l;
        }

        @Override
        public boolean equals(Object o) {
            if (!(o instanceof LocationRecord)) return false;
            LocationRecord other = (LocationRecord) o;
            return Objects.equals(startDate, other.startDate)
                && Objects.equals(endDate, other.endDate)
                && Objects.equals(location, other.location);
        }

        @Override
        public int hashCode() {
            return Objects.hash(startDate, endDate, location);
        }

        @Override
        public String toString() {
            return "StartDate: " + startDate + ", EndDate: " + endDate + ", Location: " + location;
        }
    }

    private static PrintWriter outputWriter;

    public static void main(String[] args) {
        try {
            // Create output file for SE19 data
            outputWriter = new PrintWriter(new FileWriter("se_combined_output.log"));

            Map<String, String> mapping = createMapping();

            // Execute SE19 logic and save to file
            mapping.forEach((inventory, assignment) -> {
                // Print header using System.out and write to file
                System.out.println("InventoryId: " + inventory + ", assignmentId: " + assignment);
                outputWriter.println("InventoryId: " + inventory + ", assignmentId: " + assignment);
                fromSE19(inventory, assignment);
                fromSE41(inventory, assignment);
            });
            outputWriter.close();

            // Now apply OutputLogDiff logic
            analyzeAndCompareResults();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static Map<String, String> createMapping() {
        Map<String, String> mapping = new HashMap<>();
        mapping.put("394892", "631866.2.120");
        mapping.put("1297792", "642251.9.101");
        mapping.put("1297794", "642251.9.103");
        mapping.put("1297797", "642251.9.105");
        mapping.put("1297803", "642251.9.107");
        mapping.put("1297810", "642251.9.111");
        mapping.put("1297814", "642251.9.113");
        mapping.put("1297825", "642251.9.117");
        mapping.put("1297828", "642251.9.119");
        mapping.put("1298862", "642251.9.125");
        mapping.put("1298866", "642251.9.127");
        mapping.put("1298868", "642251.9.129");
        mapping.put("1298878", "642251.9.131");
        mapping.put("1298879", "642251.9.132");
        mapping.put("1298880", "642251.9.133");
        mapping.put("1298881", "642251.9.134");
        mapping.put("1298943", "642251.9.136");
        mapping.put("1300187", "642251.9.138");
//        mapping.put("1300196", "642251.9.140");
//        mapping.put("1300201", "642251.9.142");
//        mapping.put("1300207", "642251.9.144");
//        mapping.put("1297716", "642251.9.59");
//        mapping.put("1297805", "642251.9.109");
//        mapping.put("1297818", "642251.9.115");
//        mapping.put("1297838", "642251.9.121");
//        mapping.put("1297842", "642251.9.123");
//        mapping.put("1300217", "642251.9.146");
//        mapping.put("1300218", "642251.9.147");
//        mapping.put("513698", "642251.9.2");
//        mapping.put("587197", "642251.9.26");
//        mapping.put("587194", "642251.9.25");
//        mapping.put("587178", "642251.9.23");
//        mapping.put("587179", "642251.9.24");
//        mapping.put("1297667", "642251.9.39");
//        mapping.put("1297674", "642251.9.41");
//        mapping.put("1297678", "642251.9.43");
//        mapping.put("1297685", "642251.9.45");
//        mapping.put("1297689", "642251.9.47");
//        mapping.put("1297695", "642251.9.49");
//        mapping.put("1297699", "642251.9.51");
//        mapping.put("1297706", "642251.9.53");
//        mapping.put("1297708", "642251.9.55");
//        mapping.put("1297710", "642251.9.57");
//        mapping.put("1297730", "642251.9.67");
//        mapping.put("585976", "642251.9.21");
//        mapping.put("585977", "642251.9.22");
//        mapping.put("1297720", "642251.9.61");
//        mapping.put("1297724", "642251.9.63");
//        mapping.put("1297728", "642251.9.65");
//        mapping.put("1297737", "642251.9.69");
//        mapping.put("1297741", "642251.9.71");
//        mapping.put("1297743", "642251.9.73");
//        mapping.put("1297745", "642251.9.75");
//        mapping.put("1297751", "642251.9.79");
//        mapping.put("1297757", "642251.9.81");
//        mapping.put("1297763", "642251.9.83");
//        mapping.put("1297786", "642251.9.97");
//        mapping.put("1297747", "642251.9.77");
//        mapping.put("1297765", "642251.9.85");
//        mapping.put("1297769", "642251.9.87");
//        mapping.put("1297771", "642251.9.89");
//        mapping.put("1297773", "642251.9.91");
//        mapping.put("1297779", "642251.9.93");
//        mapping.put("1297784", "642251.9.95");
//        mapping.put("1297788", "642251.9.99");
//        mapping.put("757529", "665610.3.24");
//        mapping.put("1302385", "693064.8.103");
//        mapping.put("1295677", "703645.11.109");
//        mapping.put("1296272", "703645.11.116");
//        mapping.put("1296295", "703645.11.125");
//        mapping.put("1296296", "703645.11.126");
//        mapping.put("1296835", "703645.11.129");
//        mapping.put("1297335", "703645.11.142");
//        mapping.put("1297336", "703645.11.143");
//        mapping.put("1297453", "703645.11.147");
//        mapping.put("1297767", "703645.11.154");
//        mapping.put("1298797", "703645.11.166");
//        mapping.put("1298832", "703645.11.169");
//        mapping.put("1298911", "703645.11.171");
//        mapping.put("1298950", "703645.11.173");
//        mapping.put("1300212", "703645.11.192");
//        mapping.put("1300271", "703645.11.196");
//        mapping.put("1302166", "703645.11.224");
//        mapping.put("1302167", "703645.11.225");
//        mapping.put("1302172", "703645.11.226");
//        mapping.put("1302173", "703645.11.227");
//        mapping.put("1302616", "703645.11.228");
//        mapping.put("1302617", "703645.11.229");
//        mapping.put("1303183", "703645.11.245");
//        mapping.put("1291247", "703645.11.4");
//        mapping.put("1293279", "703645.11.42");
//        mapping.put("1293298", "703645.11.49");
//        mapping.put("1294541", "703645.11.81");
//        mapping.put("1295006", "703645.11.85");
//        mapping.put("1295205", "703645.11.89");
//        mapping.put("1293743", "704633.7.163");
//        mapping.put("1293744", "704633.7.164");
//        mapping.put("1297630", "704633.7.165");
//        mapping.put("1297636", "704633.7.167");
//        mapping.put("1297637", "704633.7.168");
//        mapping.put("1299986", "706855.2.29");
//        mapping.put("1303750", "706855.2.33");
//        mapping.put("1298698", "706922.6.10");
//        mapping.put("1298698", "706922.6.15");
//        mapping.put("1294974", "712851.2.18");
//        mapping.put("1279974", "716154.2.120");
//        mapping.put("1291280", "716154.2.127");
//        mapping.put("1302934", "716154.2.130");
//        mapping.put("1302935", "716154.2.131");
//        mapping.put("1262840", "716154.2.96");
//        mapping.put("1298187", "718581.8.59");
//        mapping.put("1298179", "721618.1.16");
//        mapping.put("1300111", "721618.1.18");
//        mapping.put("1302708", "721618.1.24");
//        mapping.put("1281131", "721618.1.4");
//        mapping.put("1286361", "721618.1.7");
//        mapping.put("1289195", "724372.3.12");
//        mapping.put("1289574", "724372.3.20");
//        mapping.put("1289586", "724372.3.25");
//        mapping.put("1301187", "724372.3.41");
//        mapping.put("1301192", "724372.3.42");
//        mapping.put("1301193", "724372.3.43");
//        mapping.put("1301217", "724372.3.45");
//        mapping.put("1298158", "724415.1.101");
//        mapping.put("1298167", "724415.1.107");
//        mapping.put("1298730", "724415.1.118");
//        mapping.put("1300014", "724415.1.122");
//        mapping.put("1300015", "724415.1.123");
//        mapping.put("1286812", "724415.1.17");
//        mapping.put("1286816", "724415.1.21");
//        mapping.put("1286957", "724415.1.39");
//        mapping.put("1287118", "724415.1.53");
//        mapping.put("1292406", "724415.1.75");
//        mapping.put("1292407", "724415.1.76");
//        mapping.put("1293159", "724415.1.90");
//        mapping.put("1294986", "724415.1.92");
//        mapping.put("1183672", "693064.8.10");
//        mapping.put("1183673", "693064.8.11");
//        mapping.put("1303649", "693064.8.105");
//        mapping.put("1303650", "693064.8.106");
//        mapping.put("1303651", "693064.8.107");
//        mapping.put("1183680", "693064.8.13");
//        mapping.put("1183681", "693064.8.14");
//        mapping.put("1226181", "693064.8.48");
//        mapping.put("1226182", "693064.8.49");
//        mapping.put("1226186", "693064.8.53");
//        mapping.put("1226187", "693064.8.54");
//        mapping.put("1232902", "693064.8.58");
//        mapping.put("1232930", "693064.8.63");
//        mapping.put("1183547", "693064.8.8");
//        mapping.put("1295475", "703645.11.100");
//        mapping.put("1295474", "703645.11.99");
//        mapping.put("1296277", "703645.11.117");
//        mapping.put("1296278", "703645.11.118");
//        mapping.put("1297303", "703645.11.140");
//        mapping.put("1297304", "703645.11.141");
//        mapping.put("1298380", "703645.11.161");
//        mapping.put("1298387", "703645.11.163");
//        mapping.put("1299782", "703645.11.182");
//        mapping.put("1299783", "703645.11.183");
//        mapping.put("1299784", "703645.11.184");
//        mapping.put("1293738", "703645.11.61");
//        mapping.put("1293739", "703645.11.62");
//        mapping.put("1295217", "703645.11.96");
//        mapping.put("1295219", "703645.11.98");
//        mapping.put("1232572", "704633.7.11");
//        mapping.put("1268395", "704633.7.117");
//        mapping.put("1274187", "704633.7.129");
//        mapping.put("1274188", "704633.7.130");
//        mapping.put("1276666", "704633.7.139");
//        mapping.put("1291028", "704633.7.159");
//        mapping.put("1291029", "704633.7.160");
//        mapping.put("1291031", "704633.7.162");
//        mapping.put("1232582", "704633.7.21");
//        mapping.put("1253596", "704633.7.81");
//        mapping.put("1265454", "706855.2.23");
//        mapping.put("1265455", "706855.2.24");
//        mapping.put("1265456", "706855.2.25");
//        mapping.put("1178396", "707377.1.31");
//        mapping.put("1193095", "707377.1.32");
//        mapping.put("1193096", "707377.1.33");
//        mapping.put("1234408", "707377.1.41");
//        mapping.put("1245764", "707377.1.44");
//        mapping.put("1245765", "707377.1.45");
//        mapping.put("1245766", "707377.1.46");
//        mapping.put("1246813", "707377.1.48");
//        mapping.put("1246824", "707377.1.49");
//        mapping.put("1246825", "707377.1.50");
//        mapping.put("1278444", "712851.2.11");
//        mapping.put("1278445", "712851.2.12");
//        mapping.put("1278446", "712851.2.13");
//        mapping.put("1288026", "712851.2.16");
//        mapping.put("1299598", "712851.2.20");
//        mapping.put("1299599", "712851.2.21");
//        mapping.put("1240336", "712851.2.3");
//        mapping.put("1240338", "712851.2.5");
//        mapping.put("1249812", "712851.2.7");
//        mapping.put("1274697", "712851.2.9");
//        mapping.put("1263003", "716154.2.100");
//        mapping.put("1264251", "716154.2.105");
//        mapping.put("1266019", "716154.2.108");
//        mapping.put("1279552", "716154.2.118");
//        mapping.put("1279988", "716154.2.122");
//        mapping.put("1279989", "716154.2.123");
//        mapping.put("1288833", "716154.2.124");
//        mapping.put("1302881", "716154.2.129");
//        mapping.put("1252219", "716154.2.46");
//        mapping.put("1289272", "718581.8.53");
//        mapping.put("1290087", "724372.3.28");
//        mapping.put("1290088", "724372.3.29");
//        mapping.put("1290089", "724372.3.30");
//        mapping.put("1298164", "724415.1.104");
//        mapping.put("1286959", "724415.1.41");
//        mapping.put("1286960", "724415.1.42");
//        mapping.put("1286961", "724415.1.43");
//        mapping.put("1286962", "724415.1.44");
//        mapping.put("1286963", "724415.1.45");
//        mapping.put("1286972", "724415.1.46");
//        mapping.put("1286973", "724415.1.47");
//        mapping.put("1286974", "724415.1.48");
//        mapping.put("591944", "642251.9.27");
//        mapping.put("592057", "642251.9.33");
//        mapping.put("592058", "642251.9.34");
//        mapping.put("795443", "642251.9.35");
//        mapping.put("759810", "665610.3.34");
//        mapping.put("757994", "665610.3.28");
//        mapping.put("765994", "665610.3.36");
//        mapping.put("971636", "665610.3.51");
//        mapping.put("913486", "642251.9.38");
//        mapping.put("523435", "642251.9.9");
//        mapping.put("735919", "665610.3.2");
//        mapping.put("756762", "665610.3.20");
//        mapping.put("756764", "665610.3.22");

        return mapping;
    }

    private static void fromSE19(String inventoryId, String assignmentId) {
        try {
            String soapEndpointUrl = "http://dtraflocorh1134:7150/logistics-query/edm/movements";

            // SOAP request payload
            String soapXml =
                    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
                            + "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" "
                            + "xmlns:api=\"http://api.logisticsservice.trafigura.com/\">"
                            + "<soapenv:Header/>"
                            + "<soapenv:Body>"
                            + "<api:getInventoryLocationsByInventoryIds>"
                            + "<arg0>" + inventoryId + "</arg0>"
                            + "</api:getInventoryLocationsByInventoryIds>"
                            + "</soapenv:Body>"
                            + "</soapenv:Envelope>";

            // Open connection
            URL url = new URL(soapEndpointUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "text/xml;charset=UTF-8");
            connection.setRequestProperty("user", "S-1-5-21-2000478354-838170752-1801674531-535965");
            connection.setDoOutput(true);

            // Send request
            try (OutputStream os = connection.getOutputStream()) {
                os.write(soapXml.getBytes("UTF-8"));
            }

            int responseCode = connection.getResponseCode();
            StringBuilder response = new StringBuilder();
            BufferedReader br = null;
            if (responseCode >= 200 && responseCode < 300) {
                br = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));
            } else {
                System.err.println("HTTP error code: " + responseCode);
                br = new BufferedReader(new InputStreamReader(connection.getErrorStream(), "UTF-8"));
            }
            String line;
            while ((line = br.readLine()) != null) {
                response.append(line);
            }
            br.close();
            connection.disconnect();

            if (responseCode >= 200 && responseCode < 300) {
                // Parse response XML
                DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
                factory.setNamespaceAware(true);
                DocumentBuilder builder = factory.newDocumentBuilder();
                Document doc = builder.parse(new InputSource(new StringReader(response.toString())));

                NodeList invNodes = doc.getElementsByTagName("return");
                for (int i = 0; i < invNodes.getLength(); i++) {
                    Element returnElem = (Element) invNodes.item(i);
                    System.out.println("SE19");
                    outputWriter.println("SE19");
                    NodeList outerLocDurations = returnElem.getElementsByTagName("locationDurations");
                    for (int j = 0; j < outerLocDurations.getLength(); j++) {
                        Element outerLocElem = (Element) outerLocDurations.item(j);
                        NodeList innerLocDurations = outerLocElem.getElementsByTagName("locationDurations");
                        for (int k = 0; k < innerLocDurations.getLength(); k++) {
                            Element locElem = (Element) innerLocDurations.item(k);
                            String startDate = "";
                            String endDate = "";
                            String location = "";
                            NodeList startDateNodes = locElem.getElementsByTagName("ns3:date");
                            if (startDateNodes.getLength() > 0) {
                                startDate = startDateNodes.item(0).getTextContent();
                            }
                            NodeList endDateNodes = locElem.getElementsByTagName("ns3:date");
                            if (endDateNodes.getLength() > 1) {
                                endDate = endDateNodes.item(1).getTextContent();
                            }
                            NodeList locationNodes = locElem.getElementsByTagName("ns4:value");
                            if (locationNodes.getLength() > 0) {
                                location = locationNodes.item(0).getTextContent();
                            }
                            System.out.println("StartDate: " + startDate + ", EndDate: " + endDate + ", Location: " + location);
                            outputWriter.println("StartDate: " + startDate + ", EndDate: " + endDate + ", Location: " + location);
                        }
                    }
                }
                System.out.println("--------------");
                outputWriter.println("--------------");
            } else {
                System.err.println("SOAP Fault or error response:\n" + response.toString());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void fromSE41(String inventoryId, String assignmentId) {
        try {
            String soapEndpointUrl = "http://dtraflocorh912:7150/logistics-query/edm/movements";
            String userHeader = "S-1-5-21-2000478354-838170752-1801674531-535965";

            // SOAP request payload
            String soapXml =
                    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
                            + "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" "
                            + "xmlns:api=\"http://api.logisticsservice.trafigura.com/\">"
                            + "<soapenv:Header/>"
                            + "<soapenv:Body>"
                            + "<api:getAssignmentLocationByAssignmentReferenceList>"
                            + "<arg0>" + assignmentId + "</arg0>" + "</api:getAssignmentLocationByAssignmentReferenceList>"
                            + "</soapenv:Body>"
                            + "</soapenv:Envelope>";

            // Open connection
            URL url = new URL(soapEndpointUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "text/xml;charset=UTF-8");
            connection.setRequestProperty("user", userHeader);
            connection.setDoOutput(true);

            // Send request
            try (OutputStream os = connection.getOutputStream()) {
                os.write(soapXml.getBytes("UTF-8"));
            }

            int responseCode = connection.getResponseCode();
            StringBuilder response = new StringBuilder();
            BufferedReader br = null;

            if (responseCode >= 200 && responseCode < 300) {
                br = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));
            } else {
                System.err.println("HTTP error code: " + responseCode);
                br = new BufferedReader(new InputStreamReader(connection.getErrorStream(), "UTF-8"));
            }
            String line;
            while ((line = br.readLine()) != null) {
                response.append(line);
            }
            br.close();
            connection.disconnect();

            if (responseCode >= 200 && responseCode < 300) {
                // Parse response XML
                DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
                factory.setNamespaceAware(true);
                DocumentBuilder builder = factory.newDocumentBuilder();
                Document doc = builder.parse(new InputSource(new StringReader(response.toString())));

                NodeList returnNodes = doc.getElementsByTagName("return");
                for (int i = 0; i < returnNodes.getLength(); i++) {
                    Element returnElem = (Element) returnNodes.item(i);
                    System.out.println("SE41");
                    outputWriter.println("SE41");
                    NodeList outerLocDurations = returnElem.getElementsByTagName("locationDurations");
                    for (int j = 0; j < outerLocDurations.getLength(); j++) {
                        Element outerLocElem = (Element) outerLocDurations.item(j);
                        NodeList innerLocDurations = outerLocElem.getElementsByTagName("locationDurations");
                        for (int k = 0; k < innerLocDurations.getLength(); k++) {
                            Element locElem = (Element) innerLocDurations.item(k);
                            String startDate = "";
                            String endDate = "";
                            String location = "";
                            NodeList startDateNodes = locElem.getElementsByTagName("ns3:date");
                            if (startDateNodes.getLength() > 0) {
                                startDate = startDateNodes.item(0).getTextContent();
                            }
                            NodeList endDateNodes = locElem.getElementsByTagName("ns3:date");
                            if (endDateNodes.getLength() > 1) {
                                endDate = endDateNodes.item(1).getTextContent();
                            }
                            NodeList locationNodes = locElem.getElementsByTagName("ns4:value");
                            if (locationNodes.getLength() > 0) {
                                location = locationNodes.item(0).getTextContent();
                            }
                            System.out.println("StartDate: " + startDate + ", EndDate: " + endDate + ", Location: " + location);
                            outputWriter.println("StartDate: " + startDate + ", EndDate: " + endDate + ", Location: " + location);
                        }
                    }
                    System.out.println("--------------------------------");
                    outputWriter.println("--------------------------------");
                }
            } else {
                System.err.println("SOAP Fault or error response:\n" + response.toString());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void analyzeAndCompareResults() throws Exception {
        Map<String, Map<String, List<LocationRecord>>> data = new LinkedHashMap<>();
        BufferedReader br = new BufferedReader(new FileReader("se_combined_output.log"));
        String line;
        String currentAssignment = null;
        String currentSE = null;

        while ((line = br.readLine()) != null) {
            line = line.trim();
            // Always extract assignmentId if present in the line
            
            Matcher m = Pattern.compile("assignmentId: ([^,\s]+)").matcher(line);
            if (m.find()) {
                currentAssignment = m.group(1);
                data.putIfAbsent(currentAssignment, new HashMap<>());
                // System.out.println("Processing assignmentId: " + currentAssignment); // Progress output
            }
            if ((line.equals("SE19") || line.equals("SE41")) && currentAssignment != null) {
                currentSE = line;
                data.get(currentAssignment).putIfAbsent(currentSE, new ArrayList<>());
            } else if (line.startsWith("StartDate:") && currentAssignment != null && currentSE != null) {
                Matcher m2 = Pattern.compile("StartDate: ([^,]+), EndDate: ([^,]*), Location: (.+)").matcher(line);
                if (m2.find()) {
                    data.get(currentAssignment).get(currentSE)
                        .add(new LocationRecord(m2.group(1).trim(), m2.group(2).trim(), m2.group(3).trim()));
                }
            }
        }
        br.close();

        // Group assignments by quotaId (first two tokens of assignmentId)
        Map<String, List<String>> quotaToAssignments = new LinkedHashMap<>();
        for (String assignment : data.keySet()) {
            String[] tokens = assignment.split("\\.");
            if (tokens.length >= 2) {
                String quotaId = tokens[0] + "." + tokens[1];
                quotaToAssignments.computeIfAbsent(quotaId, k -> new ArrayList<>()).add(assignment);
            }
        }

        for (String quotaId : quotaToAssignments.keySet()) {
            System.out.println("quotaId: " + quotaId);
            List<String> sameAssignments = new ArrayList<>();
            List<String> differentAssignments = new ArrayList<>();

            for (String assignment : quotaToAssignments.get(quotaId)) {
                List<LocationRecord> se19 = data.get(assignment).getOrDefault("SE19", new ArrayList<>());
                List<LocationRecord> se41 = data.get(assignment).getOrDefault("SE41", new ArrayList<>());

                if (se19.equals(se41)) {
                    sameAssignments.add("  assignmentId: " + assignment + " SAME");
                } else {
                    StringBuilder sb = new StringBuilder();
                    sb.append("  assignmentId: ").append(assignment).append(" DIFFERENT ");
                    sb.append("\n\nSE19: \n");
                    if (se19.isEmpty()) {
                        sb.append("(no records) \n");
                    } else {
                        for (LocationRecord r : se19) sb.append(r + "\n");
                    }
                    sb.append("\n\nSE41: ");
                    if (se41.isEmpty()) {
                        sb.append("(no records) \n");
                    } else {
                        for (LocationRecord r : se41) sb.append(r + "\n");
                    }
                    differentAssignments.add(sb.toString().trim());
                }
            }

            // Print all SAME assignments first
            if (!sameAssignments.isEmpty()) {
                System.out.println("  --- SAME ---");
                for (String s : sameAssignments) {
                    System.out.println(s);
                }
            }
            // Print all DIFFERENT assignments after
            if (!differentAssignments.isEmpty()) {
                System.out.println("  --- DIFFERENT ---");
                for (String d : differentAssignments) {
                    System.out.println(d);
                }
            }
            System.out.println(); // Empty line between quota groups
        }
    }
}
