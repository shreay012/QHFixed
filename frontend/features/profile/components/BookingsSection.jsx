'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useI18nRouter } from '@/lib/hooks/useI18nRouter';
import { useTranslations } from 'next-intl';
import { fetchOngoingBookings, fetchCompletedBookings } from '@/lib/redux/slices/bookingSlice/bookingSlice';
import { getServiceIcon } from '@/lib/utils/serviceIcon';
import { Pagination } from '@/components/common';
import Image from 'next/image';

const BookingsSection = () => {
  const dispatch = useDispatch();
  const router = useI18nRouter();
  const t = useTranslations('bookingsSection');
  const tBooking = useTranslations('booking');
  const [activeTab, setActiveTab] = useState('ongoing');
  
  // Get bookings from Redux
  const { 
    ongoingBookings: ongoingBookingsData, 
    ongoingBookingsPagination, 
    isFetchingOngoingBookings,
    completedBookings: completedBookingsData,
    completedBookingsPagination,
    isFetchingCompletedBookings,
    error 
  } = useSelector((state) => state.booking);

  useEffect(() => {
    // Fetch ongoing bookings when component mounts
    dispatch(fetchOngoingBookings({ page: 1, pageSize: 10 }));
  }, [dispatch]);

  // Fetch completed bookings when tab changes to completed
  useEffect(() => {
    if (activeTab === 'completed') {
      dispatch(fetchCompletedBookings({ page: 1, pageSize: 10 }));
    }
  }, [activeTab, dispatch]);

  const handlePageChange = (page) => {
    if (activeTab === 'ongoing') {
      dispatch(fetchOngoingBookings({ page, pageSize: 10 }));
    } else {
      dispatch(fetchCompletedBookings({ page, pageSize: 10 }));
    }
  };

  // Handle Re-Book navigation
  const handleReBook = (serviceData) => {
    if (serviceData) {
      // Store the selected service in sessionStorage
      sessionStorage.setItem("selectedService", JSON.stringify(serviceData));
      // Navigate to the service details page
      router.push(`/service-details/${serviceData.slug || serviceData._id}`);
    }
  };

  // Transform API data to component format - flatten services array
  const ongoingBookings = (ongoingBookingsData || []).flatMap((booking) => {
    // Map each service within the booking to a separate card
    return booking.services?.map((service) => {
      // Determine status based on assignedResource and projectManager
      let statusTitle = tBooking('pending');
      let statusMessage = tBooking('tpmAssigningResource');
      let hasUnreadMessages = service.chatSummary?.unreadChatCount > 0;
      let statusType = 'pending'; // 'developer', 'pm', or 'pending'

      if (service.assignedResource && service.assignedResource.name) {
        // Developer assigned
        statusTitle = service.assignedResource.name;
        statusMessage = tBooking('developerAssigned');
        statusType = 'developer';
      } else if (service.projectManager && service.projectManager.name) {
        // PM assigned
        statusTitle = service.projectManager.name;
        statusMessage = tBooking('startChatTpm');
        statusType = 'pm';
      } else if (!service.assignedResource && !service.projectManager) {
        // No one assigned yet
        statusTitle = tBooking('pending');
        statusMessage = tBooking('tpmAssigningResource');
        statusType = 'pending';
      }
      
      return {
        id: service.bookingId,
        service: service.serviceId?.name || 'Service',
        icon: getServiceIcon(service.serviceId),
        startDate: service.preferredStartDate ? new Date(service.preferredStartDate).toLocaleDateString() : 'N/A',
        endDate: service.preferredEndDate ? new Date(service.preferredEndDate).toLocaleDateString() : 'N/A',
        duration: `${service.durationTime || 0} Hours`,
        status: service.status || 'pending',
        statusTitle: statusTitle,
        statusMessage: statusMessage,
        hasUnreadMessages: hasUnreadMessages,
        statusType: statusType,
        // Store actual IDs for chat functionality
        parentBookingId: booking._id, // Parent booking/job ID (for history API)
        serviceBookingId: service._id, // Service booking ID (for pending state & history API)
        serviceId: service.serviceId?._id || service.serviceId, // Service type ID
        projectManagerId: service.projectManager?._id || service.projectManager,
        assignedResourceId: service.assignedResource?._id || service.assignedResource,
        projectManagerName: service.projectManager?.name || 'Not Assigned',
        assignedResourceName: service.assignedResource?.name || 'Not Assigned',
        technologyIds: service.technologyIds || [], // Technology/skills data
      };
    }) || [];
  });

  // Transform completed bookings API data
  const completedBookings = (completedBookingsData || []).flatMap((booking) => {
    return booking.services?.map((service) => ({
      id: service.bookingId,
      resource: service.serviceId?.name || 'Service',
      icon: getServiceIcon(service.serviceId),
      serviceData: service.serviceId, // Store full service object
      startDate: service.preferredStartDate ? new Date(service.preferredStartDate).toLocaleDateString() : 'N/A',
      endDate: service.preferredEndDate ? new Date(service.preferredEndDate).toLocaleDateString() : 'N/A',
      duration: `${service.durationTime || 0} Hours`,
      projectManager: service.projectManager ? { 
        name: service.projectManager.name, 
        avatar: '/avtar.png' 
      } : { name: 'N/A', avatar: '/avtar.png' },
      developer: service.assignedResource ? { 
        name: service.assignedResource.name, 
        avatar: '/avtar.png' 
      } : { name: 'N/A', avatar: '/avtar.png' },
    })) || [];
  });

  return (
    <div className="w-full lg:flex-1">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[700] text-[18px] sm:text-[20px] lg:text-[24px] mb-6" style={{ color: '#202224' }}>{t('title')}</h1>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-gray-300">
          <button
            onClick={() => setActiveTab('ongoing')}
            className={`pb-3 font-semibold font-opensauce transition-colors ${
              activeTab === 'ongoing'
                ? 'text-[#45A735] border-b-2 border-[#45A735]'
                : 'text-[#6A7282] hover:text-[#6A7282]'
            }`}
            style={{ fontWeight: 700, fontSize: '14px' }}
          >
            {t('ongoingTab')}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-3 font-semibold font-opensauce transition-colors ${
              activeTab === 'completed'
                ? 'text-[#45A735] border-b-2 border-[#45A735]'
                : 'text-[#6A7282] hover:text-[#6A7282]'
            }`}
            style={{ fontWeight: 700, fontSize: '14px' }}
          >
            {t('completedTab')}
          </button>
        </div>
      </div>

      {/* Bookings Grid */}
      {activeTab === 'ongoing' && (
        <>
          <div className="h-[480px] overflow-y-auto">
            {isFetchingOngoingBookings ? (
              <div className="flex justify-center items-center h-64">
                <p>{t('loading')}</p>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-red-500">{error}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pr-4">
                {ongoingBookings.length > 0 ? (
                  ongoingBookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 flex items-center justify-center rounded-lg">
                            <Image 
                              src={`${process.env.NEXT_PUBLIC_BACKEND_URL}${booking.icon}`} 
                              alt={booking.icon} 
                              width={24} 
                              height={24}
                              style={{ filter: 'brightness(0) saturate(100%) invert(47%) sepia(89%) saturate(465%) hue-rotate(70deg) brightness(94%) contrast(89%)' }}
                            />
                          </div>
                          <span className="font-bold text-sm md:text-base lg:text-base" style={{ color: '#242424' }}>{booking.service}</span>
                        </div>
                        <span className="text-xs font-normal px-3 py-1 rounded-full" style={{ backgroundColor: '#45A7351A', color: '#45A735' }}>
                          {t('recentlyBook')}
                        </span>
                      </div>

                  
                      <div className="border-t border-gray-200 my-4"></div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs font-opensauce mb-1" style={{ color: '#909090', fontWeight: 500 }}>{t('bookingId')}</p>
                          <p className="break-words" style={{ color: '#242424', fontWeight: 400, fontSize: '14px' }}>{booking.id}</p>
                        </div>
                        <div>
                          <p className="text-xs font-opensauce mb-1" style={{ color: '#909090', fontWeight: 500 }}>{t('startDate')}</p>
                          <p className="break-words" style={{ color: '#242424', fontWeight: 400, fontSize: '14px' }}>{booking.startDate}</p>
                        </div>
                        <div>
                          <p className="text-xs font-opensauce mb-1" style={{ color: '#909090', fontWeight: 500 }}>{t('endDate')}</p>
                          <p className="break-words" style={{ color: '#242424', fontWeight: 400, fontSize: '14px' }}>{booking.endDate}</p>
                        </div>
                        <div>
                          <p className="text-xs font-opensauce mb-1" style={{ color: '#909090', fontWeight: 500 }}>{t('duration')}</p>
                          <p className="break-words" style={{ color: '#242424', fontWeight: 400, fontSize: '14px' }}>{booking.duration}</p>
                        </div>
                      </div>

               
                      <div className="border-t border-gray-200 my-4"></div>

                    
                      <div
                        onClick={() => {
                          const otherServices = ongoingBookings
                            .filter(b => b.id !== booking.id)
                            .map(b => ({
                              id: b.id,
                              resource: b.service,
                              icon: b.icon,
                              hasUnread: b.hasUnreadMessages
                            }));
                          
                        
                          const bookingData = {
                            bookingId: booking.id,
                            parentBookingId: booking.parentBookingId, // Parent booking/job ID (for history API)
                            serviceBookingId: booking.serviceBookingId, // Service booking ID (for pending & history API)
                            serviceId: booking.serviceId, // Service type ID
                            projectManagerId: booking.projectManagerId,
                            assignedResourceId: booking.assignedResourceId,
                            serviceName: booking.service,
                            duration: booking.duration,
                            startDate: booking.startDate,
                            endDate: booking.endDate,
                            projectManagerName: booking.projectManagerName,
                            assignedResourceName: booking.assignedResourceName,
                            statusType: booking.statusType, // To determine which ID to use
                            technologyIds: booking.technologyIds || [], // Technology/skills data
                            otherBookings: otherServices, // Other ongoing services
                          };
                          
                          sessionStorage.setItem('currentBooking', JSON.stringify(bookingData));
                          const encodedId = encodeURIComponent(booking.id);
                          router.push(`/booking-workspace/${encodedId}`);
                        }}
                        className={`rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity ${
                          booking.statusType === 'developer'
                          ? 'bg-[#DADADA] border border-[#D9E5E3]'
                          : booking.statusType === 'pm'
                          ? 'bg-[#EDF7EB] border border-[#D9E5E3]'
                          : 'bg-[#F9EEDC] border border-[#D9E5E3]'
                      }`}
                    >
                        <div className="flex-shrink-0">
                          <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full">
                            <Image 
                              src={
                                booking.statusType === 'pm' 
                                  ? '/images/ChatsCirclepm.svg' 
                                  : booking.hasUnreadMessages || booking.statusType === 'developer'
                                  ? '/ChatsCircle.svg'
                                  : '/pending.svg'
                              } 
                              alt={
                                booking.statusType === 'pm' 
                                  ? 'PM Chat Icon' 
                                  : booking.hasUnreadMessages || booking.statusType === 'developer'
                                  ? 'Chat Icon'
                                  : 'Pending Icon'
                              } 
                              width={24} 
                              height={24} 
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${booking.hasUnreadMessages ? 'text-gray-900' : 'text-gray-900'}`}>
                            {booking.statusTitle}
                          </p>
                          <p className="text-xs text-gray-600">{booking.statusMessage}</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-1 lg:col-span-2 flex flex-col items-center justify-center py-20">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="#9CA3AF" strokeWidth="2" />
                        <path d="M3 9h18" stroke="#9CA3AF" strokeWidth="2" />
                        <path d="M9 14h6M9 19h6" stroke="#9CA3AF" strokeWidth="2" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-opensauce text-center">{t('noOngoing')}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pagination - Outside scrollable area */}
          {ongoingBookings.length > 0 && ongoingBookingsPagination && (
            <Pagination
              currentPage={ongoingBookingsPagination.currentPage}
              totalPages={ongoingBookingsPagination.totalPages}
              onPageChange={handlePageChange}
              hasNextPage={ongoingBookingsPagination.hasNextPage}
              hasPrevPage={ongoingBookingsPagination.hasPrevPage}
            />
          )}
        </>
      )}

      {/* Completed Bookings Tab */}
      {activeTab === 'completed' && (
        <>
          <div className="h-[480px] overflow-y-auto">
            {isFetchingCompletedBookings ? (
              <div className="flex justify-center items-center h-64">
                <p>{t('loadingCompleted')}</p>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-red-500">{error}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pr-4">
                {completedBookings.length > 0 ? (
                  completedBookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                      {/* Header with Icon and Resource Name */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 flex items-center justify-center rounded-lg">
                          <Image 
                            src={`${process.env.NEXT_PUBLIC_BACKEND_URL}${booking.icon}`} 
                            alt={booking.resource} 
                            width={24} 
                            height={24}
                            style={{ filter: 'brightness(0) saturate(100%) invert(47%) sepia(89%) saturate(465%) hue-rotate(70deg) brightness(94%) contrast(89%)' }}
                          />
                        </div>
                        <span className="font-bold text-sm md:text-base" style={{ color: '#242424' }}>{booking.resource}</span>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200 my-4"></div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs font-opensauce mb-1" style={{ color: '#909090', fontWeight: 500 }}>{t('bookingId')}</p>
                          <p className="break-words" style={{ color: '#242424', fontWeight: 400, fontSize: '14px' }}>{booking.id}</p>
                        </div>
                        <div>
                          <p className="text-xs font-opensauce mb-1" style={{ color: '#909090', fontWeight: 500 }}>{t('startDate')}</p>
                          <p className="break-words" style={{ color: '#242424', fontWeight: 400, fontSize: '14px' }}>{booking.startDate}</p>
                        </div>
                        <div>
                          <p className="text-xs font-opensauce mb-1" style={{ color: '#909090', fontWeight: 500 }}>{t('endDate')}</p>
                          <p className="break-words" style={{ color: '#242424', fontWeight: 400, fontSize: '14px' }}>{booking.endDate}</p>
                        </div>
                        <div>
                          <p className="text-xs font-opensauce mb-1" style={{ color: '#909090', fontWeight: 500 }}>{t('duration')}</p>
                          <p className="break-words" style={{ color: '#242424', fontWeight: 400, fontSize: '14px' }}>{booking.duration}</p>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200 my-4"></div>

                      {/* Team Members */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <Image src="/avtar.png" alt="Project Manager Avatar" width={40} height={40} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs" style={{ color: '#909090', fontWeight: 500 }}>{t('projectManager')}</p>
                            <p className="text-sm font-semibold" style={{ color: '#242424' }}>{booking.projectManager.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <Image src="/avtar.png" alt="Developer Avatar" width={40} height={40} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs" style={{ color: '#909090', fontWeight: 500 }}>{t('developer')}</p>
                            <p className="text-sm font-semibold" style={{ color: '#242424' }}>{booking.developer.name}</p>
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200 my-4"></div>

                      {/* Re-Book Button */}
                      <button 
                        onClick={() => handleReBook(booking.serviceData)}
                        className="py-2 px-4 rounded-lg text-white hover:opacity-90 transition-opacity" 
                        style={{ backgroundColor: '#45A735', width: '30%', fontWeight: 600, fontSize: '12px' }}
                      >
                        {t('reBook')}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-1 lg:col-span-2 flex flex-col items-center justify-center py-20">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="#9CA3AF" strokeWidth="2" />
                        <path d="M3 9h18" stroke="#9CA3AF" strokeWidth="2" />
                        <path d="M9 14h6M9 19h6" stroke="#9CA3AF" strokeWidth="2" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-opensauce text-center">{t('noCompleted')}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pagination - Outside scrollable area */}
          {completedBookings.length > 0 && completedBookingsPagination && (
            <Pagination
              currentPage={completedBookingsPagination.currentPage}
              totalPages={completedBookingsPagination.totalPages}
              onPageChange={handlePageChange}
              hasNextPage={completedBookingsPagination.hasNextPage}
              hasPrevPage={completedBookingsPagination.hasPrevPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default BookingsSection;
