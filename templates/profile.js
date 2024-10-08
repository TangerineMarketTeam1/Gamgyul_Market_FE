document.addEventListener('DOMContentLoaded', function() {
    // Constants and Config
    const API_BASE_URL = 'http://127.0.0.1:8000';
    const DEFAULT_PROFILE_IMAGE = '/templates/images/team_profile.png';
    const USERS_TO_SHOW = 5;

    // DOM Elements
    const profileImage = document.getElementById('profile-image');
    const usernameElement = document.getElementById('username');
    const bioElement = document.getElementById('bio');
    const followersCountElement = document.getElementById('followers-count');
    const followingCountElement = document.getElementById('following-count');
    const followBtn = document.getElementById('follow-btn');
    const followersList = document.getElementById('followers');
    const followingList = document.getElementById('following');
    const productList = document.getElementById('product-list');
    const loginLink = document.getElementById('login-link');
    const logoutBtn = document.getElementById('logout-btn');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const profileSettingsBtn = document.getElementById('profile-settings-btn');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const navProfileImage = document.getElementById('nav-profile-image');
    const dropdownProfileImage = document.getElementById('dropdown-profile-image');
    const dropdownUsername = document.getElementById('dropdown-username');
    const dropdownEmail = document.getElementById('dropdown-email');
    const signOutLink = document.getElementById('sign-out-link');
    const viewProfileLink = document.getElementById('view-profile-link');
    const profileSettingsLink = document.getElementById('profile-settings-link');

    // State
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    let allFollowers = [];
    let allFollowing = [];

    // Utility Functions
    function getCurrentUsername() {
        return localStorage.getItem('username') || '';
    }

    function getCSRFToken() {
        const csrfCookie = document.cookie.split('; ')
            .find(row => row.startsWith('csrftoken='));
        return csrfCookie ? csrfCookie.split('=')[1] : null;
    }

    async function fetchWithCSRF(url, method = 'GET', body = null) {
        const csrfToken = getCSRFToken();
        if (!csrfToken) {
            throw new Error('CSRF token not found');
        }
        
        const options = {
            method: method,
            credentials: 'include',
            headers: {
                'X-CSRFToken': csrfToken,
            }
        };
    
        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
            options.headers['Content-Type'] = 'application/json';
        }
    
        return fetch(url, options);
    }

    function showErrorMessage(message) {
        alert(message);
    }

    // Profile Functions
    async function loadProfile() {
        try {
            const response = await fetchWithCSRF(`${API_BASE_URL}/accounts/profile/${username}/`);
            if (response.ok) {
                const profileData = await response.json();
                console.log('Received profile data:', profileData); // 추가된 로그
                updateProfileUI(profileData);
            } else if (response.status === 401) {
                showLoginLink();
            } else {
                throw new Error('프로필 로드 실패');
            }
        } catch (error) {
            console.error('프로필 로드 중 오류 발생:', error);
            showErrorMessage('프로필을 불러오는 데 실패했습니다. 다시 시도해 주세요.');
        }
    }

    function getFullImageUrl(imageUrl) {
        if (!imageUrl) return DEFAULT_PROFILE_IMAGE;
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }
        return `${API_BASE_URL}${imageUrl}`;
    }

    function updateProfileUI(profileData) {
        if (profileImage) profileImage.src = getFullImageUrl(profileData.profile_image) || DEFAULT_PROFILE_IMAGE;
        if (usernameElement) usernameElement.textContent = profileData.username;
        if (bioElement) bioElement.textContent = profileData.bio || '소개가 없습니다.';
        if (followersCountElement) followersCountElement.textContent = profileData.followers_count || 0;
        if (followingCountElement) followingCountElement.textContent = profileData.following_count || 0;
    
        updateEmailDisplay(profileData);
        renderFollowersList(profileData.followers || []);
        renderFollowingList(profileData.following || []);
        renderProductList(profileData.products || []);
        updateProfileButtons(profileData.is_self);
    
        if (loginLink) loginLink.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline';
    }

    function updateEmailDisplay(profileData) {
        const emailElement = document.getElementById('email-address');
        const emailContainer = document.getElementById('email');
        if (emailElement && emailContainer) {
            if (profileData.email && (profileData.is_self || profileData.show_email)) {
                emailElement.textContent = profileData.email;
                emailContainer.style.display = 'block';
            } else {
                emailContainer.style.display = 'none';
            }
        }
    }

    function updateProfileButtons(isSelf) {
        if (isSelf) {
            followBtn.style.display = 'none';
            editProfileBtn.style.display = 'inline';
            profileSettingsBtn.style.display = 'inline';
        } else {
            followBtn.style.display = 'inline';
            editProfileBtn.style.display = 'none';
            profileSettingsBtn.style.display = 'none';
        }
    }

    function updateProfileDropdown(profileData) {
        if (navProfileImage) navProfileImage.src = getFullImageUrl(profileData.profile_image) || DEFAULT_PROFILE_IMAGE;
        if (dropdownProfileImage) dropdownProfileImage.src = getFullImageUrl(profileData.profile_image) || DEFAULT_PROFILE_IMAGE;
        if (dropdownUsername) dropdownUsername.textContent = profileData.username;
        if (dropdownEmail) dropdownEmail.textContent = profileData.email;
    
        if (viewProfileLink) {
            viewProfileLink.href = `/templates/profile.html?username=${profileData.username}`;
        }
    
        if (profileSettingsLink) {
            profileSettingsLink.href = `/templates/profile-settings.html?username=${profileData.username}`;
        }
    }

    // 팔로워 목록을 렌더링할 때
    function renderFollowersList(followers) {
        if (!Array.isArray(followers)) {
            console.warn('Followers data is not an array:', followers);
            followers = [];
        }
        allFollowers = followers; // 모든 팔로워를 포함
        updateFollowersList();
        if (followersCountElement) {
            followersCountElement.textContent = allFollowers.length;
        }
    }
    
    // 팔로잉 목록을 렌더링할 때
    function renderFollowingList(following) {
        if (!Array.isArray(following)) {
            console.warn('Following data is not an array:', following);
            following = [];
        }
        allFollowing = following; // 모든 팔로잉 사용자를 포함
        updateFollowingList();
    }

    function updateFollowersList(showAll = false) {
        const followersToShow = showAll ? allFollowers : allFollowers.slice(0, USERS_TO_SHOW);
        followersList.innerHTML = followersToShow.map(follower => createUserListItem(follower, 'follower')).join('');
        
        const showMoreFollowersBtn = document.getElementById('show-more-followers');
        if (allFollowers.length > USERS_TO_SHOW) {
            showMoreFollowersBtn.style.display = showAll ? 'none' : 'block';
            showMoreFollowersBtn.onclick = () => updateFollowersList(true);
        } else {
            showMoreFollowersBtn.style.display = 'none';
        }

        addUserInteractionListeners();
    }

    function updateFollowingList(showAll = false) {
        const followingToShow = showAll ? allFollowing : allFollowing.slice(0, USERS_TO_SHOW);
        followingList.innerHTML = followingToShow.map(following => createUserListItem(following, 'following')).join('');
        
        const showMoreFollowingBtn = document.getElementById('show-more-following');
        if (allFollowing.length > USERS_TO_SHOW) {
            showMoreFollowingBtn.style.display = showAll ? 'none' : 'block';
            showMoreFollowingBtn.onclick = () => updateFollowingList(true);
        } else {
            showMoreFollowingBtn.style.display = 'none';
        }

        addUserInteractionListeners();
    }

    function createUserListItem(user, type) {
        const currentUser = localStorage.getItem('username');
        const isCurrentUser = user.username === currentUser;
        
        return `
            <li class="list-group-item d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                     <img src="${getFullImageUrl(user.profile_image) || DEFAULT_PROFILE_IMAGE}" alt="${user.username}" class="avatar-img rounded-circle" style="width: 40px; height: 40px;">
                    <div class="ms-3">
                        <h6 class="mb-0">${user.username}${isCurrentUser ? ' (나)' : ''}</h6>
                    </div>
                </div>
                <div>
                    ${!isCurrentUser ? `
                        <button class="btn btn-sm btn-primary-soft me-2 chat-btn" data-user-id="${user.id}">
                            <i class="bi bi-chat-left-text"></i>
                        </button>
                        <button class="btn btn-sm ${type === 'following' ? 'btn-danger-soft unfollow-btn' : 'btn-success-soft follow-btn'}" data-user-id="${user.id}">
                            ${type === 'following' ? '언팔로우' : '팔로우'}
                        </button>
                    ` : ''}
                </div>
            </li>
        `;
    }

    // Product Functions
    function renderProductList(products) {
        if (products && products.length > 0) {
            const productListHtml = products.map(product => `
                <div class="card mb-3">
                    <div class="row g-0">
                        <div class="col-md-4">
                            <img src="${product.images[0] || DEFAULT_PROFILE_IMAGE}" class="img-fluid rounded-start" alt="${product.name}">
                        </div>
                        <div class="col-md-8">
                            <div class="card-body">
                                <h5 class="card-title">${product.name}</h5>
                                <p class="card-text">가격: ${product.price}</p>
                                <p class="card-text">재고: ${product.stock}</p>
                                <p class="card-text">품종: ${product.variety}</p>
                                <p class="card-text">재배 지역: ${product.growing_region}</p>
                                <p class="card-text">수확일: ${product.harvest_date}</p>
                                <p class="card-text"><small class="text-muted">평균 평점: ${product.average_rating}</small></p>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
            
            productList.innerHTML = productListHtml;
        } else {
            productList.innerHTML = '<p>등록된 상품이 없습니다.</p>';
        }
    }

    // Event Handlers
    async function handleFollow() {
        try {
            const response = await fetchWithCSRF(`${API_BASE_URL}/accounts/follow/${username}/`, 'POST');
            if (response.ok) {
                loadProfile();
            } else {
                throw new Error('팔로우 실패');
            }
        } catch (error) {
            console.error('팔로우 중 오류 발생:', error);
            showErrorMessage('팔로우 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
        }
    }

    async function handleFollowUnfollow(event) {
        const userId = event.target.getAttribute('data-user-id');
        const isFollowing = event.target.classList.contains('unfollow-btn');
        const url = isFollowing 
            ? `${API_BASE_URL}/accounts/unfollow/${userId}/`
            : `${API_BASE_URL}/accounts/follow/${userId}/`;
        
        try {
            const response = await fetchWithCSRF(url, isFollowing ? 'DELETE' : 'POST');
            if (response.ok) {
                const data = await response.json();
                updateFollowButton(event.target, !isFollowing);
                updateFollowCounts(data);
            } else {
                throw new Error(isFollowing ? '언팔로우 실패' : '팔로우 실패');
            }
        } catch (error) {
            console.error(`${isFollowing ? '언팔로우' : '팔로우'} 중 오류 발생:`, error);
            showErrorMessage(`${isFollowing ? '언팔로우' : '팔로우'} 처리 중 오류가 발생했습니다.`);
        }
    }

    function updateFollowButton(button, isCurrentlyFollowing) {
        if (isCurrentlyFollowing) {
            button.textContent = '팔로우';
            button.classList.remove('unfollow-btn', 'btn-danger-soft');
            button.classList.add('follow-btn', 'btn-success-soft');
        } else {
            button.textContent = '언팔로우';
            button.classList.remove('follow-btn', 'btn-success-soft');
            button.classList.add('unfollow-btn', 'btn-danger-soft');
        }
    }

    function updateFollowCounts(data) {
        if (followingCountElement) {
            followingCountElement.textContent = data.following_count;
        }
    }

    async function handleLogout(e) {
        e.preventDefault();
        try {
            const response = await fetchWithCSRF(`${API_BASE_URL}/accounts/logout/`, 'POST');
            if (response.ok) {
                localStorage.removeItem('username');
                window.location.href = '/templates/login.html';
            } else {
                throw new Error('로그아웃 실패');
            }
        } catch (error) {
            console.error('로그아웃 중 오류 발생:', error);
            showErrorMessage('로그아웃 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
        }
    }

    function handleChat(event) {
        const userId = event.target.closest('button').getAttribute('data-user-id');
        console.log(`Chat with user ${userId}`);
        // 채팅 기능 구현 (예: 채팅 페이지로 이동)
    }

    // Search Functions
    async function searchUsers(query) {
        try {
            const response = await fetchWithCSRF(`${API_BASE_URL}/accounts/search/?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error('Search request failed');
            }
            const data = await response.json();
            displaySearchResults(data);
        } catch (error) {
            console.error('Search error:', error);
            showErrorMessage('사용자 검색 중 오류가 발생했습니다.');
        }
    }

    function displaySearchResults(data) {
        const results = data.results || [];
        searchResults.innerHTML = '';

        if (results.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        results.forEach(user => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <img src="${user.profile_image || DEFAULT_PROFILE_IMAGE}" alt="${user.username}" width="30">
                <span>${user.username}</span>
            `;
            resultItem.addEventListener('click', () => {
                window.location.href = `/templates/profile.html?username=${user.username}`;
            });
            searchResults.appendChild(resultItem);
        });

        searchResults.style.display = 'block';
    }

    // Helper Functions
    function addUserInteractionListeners() {
        document.querySelectorAll('.chat-btn').forEach(button => {
            button.addEventListener('click', handleChat);
        });

        document.querySelectorAll('.follow-btn, .unfollow-btn').forEach(button => {
            button.addEventListener('click', handleFollowUnfollow);
        });
    }

    function showLoginLink() {
        loginLink.style.display = 'inline';
        logoutBtn.style.display = 'none';
    }

    // Initialization
    async function loadLoggedInUserProfile() {
        try {
            const loggedInUsername = getCurrentUsername();
            if (!loggedInUsername) {
                throw new Error('로그인한 사용자 정보를 찾을 수 없습니다.');
            }
            const response = await fetchWithCSRF(`${API_BASE_URL}/accounts/profile/${loggedInUsername}/`);
            if (response.ok) {
                const profileData = await response.json();
                updateProfileDropdown(profileData);
            } else {
                throw new Error('로그인한 사용자 프로필 로드 실패');
            }
        } catch (error) {
            console.error('로그인한 사용자 프로필 로드 중 오류 발생:', error);
            showErrorMessage('로그인한 사용자 프로필을 불러오는 데 실패했습니다.');
        }
    }

    function initialize() {
        loadProfile();
        loadLoggedInUserProfile();

        const showMoreFollowersBtn = document.getElementById('show-more-followers');
        const showMoreFollowingBtn = document.getElementById('show-more-following');

        if (showMoreFollowersBtn) {
            showMoreFollowersBtn.addEventListener('click', () => updateFollowersList(true));
        }
        if (showMoreFollowingBtn) {
            showMoreFollowingBtn.addEventListener('click', () => updateFollowingList(true));
        }
    }

    // Event Listeners
    editProfileBtn.addEventListener('click', () => {
        window.location.href = '/templates/edit-profile.html';
    });

    if (profileSettingsBtn) {
        profileSettingsBtn.addEventListener('click', () => {
            const currentUsername = getCurrentUsername();
            window.location.href = `/templates/profile-settings.html?username=${currentUsername}`;
        });
    }

    if (profileSettingsLink) {
        profileSettingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            const currentUsername = getCurrentUsername();
            window.location.href = `/templates/profile-settings.html?username=${currentUsername}`;
        });
    }

    followBtn.addEventListener('click', handleFollow);
    signOutLink.addEventListener('click', handleLogout);

    let debounceTimer;
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = this.value.trim();
            if (query.length > 0) {
                searchUsers(query);
            } else {
                searchResults.style.display = 'none';
            }
        }, 300);
    });

    document.addEventListener('click', function(event) {
        if (!searchResults.contains(event.target) && event.target !== searchInput) {
            searchResults.style.display = 'none';
        }
    });

    // Initialize
    initialize();
});