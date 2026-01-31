import java.io.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class CompareLocationDurationData {
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

    public static void main(String[] args) throws Exception {
        Map<String, Map<String, List<LocationRecord>>> data = new LinkedHashMap<>();
        BufferedReader br = new BufferedReader(new FileReader("output.log"));
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
            String quotaId = tokens[0] + "." + tokens[1];
            quotaToAssignments.computeIfAbsent(quotaId, k -> new ArrayList<>()).add(assignment);
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
                    sb.append("  assignmentId: ").append(assignment).append(" DIFFERENT\n");
                    sb.append("    SE19:\n");
                    if (se19.isEmpty()) {
                        sb.append("      (no records)\n");
                    } else {
                        for (LocationRecord r : se19) sb.append("      ").append(r).append("\n");
                    }
                    sb.append("    SE41:\n");
                    if (se41.isEmpty()) {
                        sb.append("      (no records)\n");
                    } else {
                        for (LocationRecord r : se41) sb.append("      ").append(r).append("\n");
                    }
                    sb.append("  --------------------------------");
                    differentAssignments.add(sb.toString());
                }
            }
            // Print all SAME assignments first
            for (String s : sameAssignments) {
                System.out.println(s);
            }
            // Print all DIFFERENT assignments after
            for (String d : differentAssignments) {
                System.out.println(d);
            }
        }
    }
}
