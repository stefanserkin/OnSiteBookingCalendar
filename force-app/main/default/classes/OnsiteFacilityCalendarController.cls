public without sharing class OnsiteFacilityCalendarController {
    
    @AuraEnabled(cacheable=true)
    public static List<TREX1__Booking__c> getFacilityBookings(
        String recordId
    ) {
        try {
            Datetime dtNow = Datetime.now();
            return [
                SELECT Id, 
                       Name, 
                       TREX1__Start_Time__c, 
                       TREX1__End_Time__c, 
                       TREX1__Start_Time_Block__c, 
                       TREX1__End_Time_Block__c, 
                       TREX1__Event_Name__c, 
                       OwnerId, 
                       TREX1__Facility__c, 
                       RecordTypeId, 
                       RecordType.Name, 
                       TREX1__Type__c, 
                       TREX1__Expected_Attendance__c, 
                       TREX1__Notes__c 
                  FROM TREX1__Booking__c
                 WHERE TREX1__Facility__c = :recordId
                   AND TREX1__End_Time__c >= :dtNow
                 ORDER BY TREX1__Start_Time__c ASC
                 LIMIT 25
            ];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

}