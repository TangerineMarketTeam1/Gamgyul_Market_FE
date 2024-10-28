document.addEventListener('DOMContentLoaded', function() {
    const postList = document.getElementById('post-list');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const friendRecommendations = document.getElementById('friend-recommendations');
    const loadMoreFriendsBtn = document.getElementById('load-more-friends');
    let currentPage = 1;
    const postsPerPage = 10;
    let recommendationPage = 1;
    const recommendationsPerPage = 5;
    let allRecommendations = []; // 모든 추천 친구를 저장할 배열

    // JWT 토큰 관리 함수들
    function getJWTToken() {
        return localStorage.getItem('jwt_token');
    }

    function setJWTToken(token) {
        localStorage.setItem('jwt_token', token);
    }

    function removeJWTToken() {
        localStorage.removeItem('jwt_token');
    }

    // API 요청에 사용할 기본 헤더
    function getAuthHeaders() {
        const token = getJWTToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    // API 요청 wrapper 함수
    async function authenticatedFetch(url, options = {}) {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                }
            });

            // 토큰이 만료되었거나 유효하지 않은 경우
            if (response.status === 401) {
                removeJWTToken();
                window.location.href = '/templates/login.html';
                return null;
            }

            return response;
        } catch (error) {
            console.error('API 요청 실패:', error);
            throw error;
        }
    }

    // 게시물 목록 불러오기
    async function fetchPosts(page = 1) {
        try {
            const response = await authenticatedFetch(
                `http://127.0.0.1:8000/posts/posts/?limit=${postsPerPage}&offset=${(page - 1) * postsPerPage}`,
                { method: 'GET' }
            );

            if (response && response.ok) {
                const data = await response.json();
                return data;
            }
            return null;
        } catch (error) {
            console.error('게시물 조회 에러 발생:', error);
            return null;
        }
    }

    // 게시물 표시 함수 수정
    function displayPosts(posts) {
        console.log(posts);

        posts.forEach(async post => {  // async 추가
            const postElement = document.createElement('div');
            postElement.classList.add('card');
            
            // 댓글 수를 가져오는 API 호출
            const comments = await fetchComments(post.id);
            const commentsCount = comments ? comments.length : 0;

            postElement.innerHTML = `
                <div class="card-header border-0 pb-0">
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center">
                            <!-- Avatar -->
                            <div class="avatar avatar-story me-2">
                                <a href="#!">
                                    <img class="avatar-img rounded-circle" src="${post.user.profile_image || '/templates/images/placeholder.jpg'}" alt="${post.user.username}">
                                </a>
                            </div>
                            <!-- Info -->
                            <div>
                                <div class="nav nav-divider">
                                    <h6 class="nav-item card-title mb-0">${post.user.username}</h6>
                                    <span class="nav-item small">${new Date(post.created_at).toLocaleString()}</span>
                                </div>
                                <p class="mb-0 small">${post.location || ''}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Card body -->
                <div class="card-body post-detail-link" data-post-id="${post.id}">
                    <p>${post.content}</p>
                    <div>
                        <img src="${post.images[0] ? `${API_BASE_URL}${post.images[0]}` : '/templates/images/placeholder.jpg'}" class="card-img-top" alt="Post image">
                    </div>
                </div>
                <!-- Card feed action START -->
                <!-- 태그 표시 부분 -->
                ${post.tags ? `
                    <ul class="nav nav-stack py-3 small ms-4">
                        ${parseTags(post.tags)
                            .map(tag => `
                                <li class="nav-item d-flex justify-content-between">
                                    <span class="badge bg-primary me-1">${tag.trim()}</span>
                                </li>
                            `).join('')}
                    </ul>
                ` : ''}
                <ul class="nav nav-stack py-3 small ms-4">
                    <li class="nav-item">
                        <a class="nav-link active like-button" href="#!" data-post-id="${post.id}" data-likes-count="${post.likes_count}">
                            <i class="bi bi-hand-thumbs-up-fill pe-1"></i>좋아요 (<span class="likes-count">${post.likes_count}</span>)
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link comment-button" href="#!" data-post-id="${post.id}">
                            <i class="bi bi-chat-fill pe-1"></i>댓글 (${commentsCount})
                        </a>
                    </li>
                </ul>
                <!-- Card feed action END -->
                <!-- Comments START -->
                <div class="card-footer border-0 pt-0">
                    <!-- Comment wrap START -->
                    <ul class="comment-wrap list-unstyled">
                        ${comments ? comments.slice(0, 2).map(comment => `
                            <li class="comment-item">
                                <div class="d-flex">
                                    <div class="avatar avatar-xs">
                                        <img class="avatar-img rounded-circle" src="${comment.user.profile_image || '/templates/images/placeholder.jpg'}" alt="${comment.user.username}">
                                    </div>
                                    <div class="ms-2">
                                        <div class="bg-light rounded-start-top-0 p-3 rounded">
                                            <div class="d-flex justify-content-between">
                                                <h6 class="mb-1">${comment.user.username}</h6>
                                                <small class="ms-2">${new Date(comment.created_at).toLocaleString()}</small>
                                            </div>
                                            <p class="small mb-0">${comment.content}</p>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        `).join('') : ''}
                    </ul>
                    <!-- Comment wrap END -->
                </div>
                <!-- Comments END -->
            `;
            postList.appendChild(postElement);
        });

        addEventListeners();
    }

    // 태그 처리 함수
    function parseTags(tags) {
        if (!tags) return [];
        if (Array.isArray(tags)) return tags;
        try {
            return JSON.parse(tags);
        } catch (error) {
            console.error('태그 파싱 중 오류 발생:', error);
            return [];
        }
    }

    // 태그로 게시물 검색
    async function fetchPostsByTags(tags) {
        try {
            const tagParams = tags.map(tag => `tags=${encodeURIComponent(tag)}`).join('&');
            const response = await authenticatedFetch(
                `http://127.0.0.1:8000/search/search-post/?${tagParams}`,
                { method: 'GET' }
            );

            if (response && response.ok) {
                const data = await response.json();
                return data;
            }
            return null;
        } catch (error) {
            console.error('태그로 게시물 조회 중 에러 발생:', error);
            return null;
        }
    }

    // 검색 버튼 이벤트 핸들러
    searchButton.addEventListener('click', async () => {
        const tags = searchInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
        if (tags.length > 0) {
            const posts = await fetchPostsByTags(tags);
            if (posts && posts.results) {
                displayPosts(posts.results);
            } else {
                postList.innerHTML = '<p>검색 결과가 없습니다.</p>';
            }
        } else {
            alert('적어도 하나의 태그를 입력해주세요.');
        }
    });


    // 친구 추천 불러오기
    async function fetchFriendRecommendations() {
        try {
            const response = await authenticatedFetch(
                'http://127.0.0.1:8000/recommendations/recommend/',
                { method: 'GET' }
            );

            if (response && response.ok) {
                const data = await response.json();
                return data;
            }
            return null;
        } catch (error) {
            console.error('친구 추천 조회 에러 발생:', error);
            return null;
        }
    }

    // 친구 추천 표시
    function displayFriendRecommendations(recommendations) {
        friendRecommendations.innerHTML = ''; // 기존 추천 목록 초기화
        recommendations.forEach(user => {
            const userElement = document.createElement('div');
            userElement.classList.add('hstack', 'gap-2', 'mb-3');
            userElement.innerHTML = `
                <div class="avatar">
                    <img class="avatar-img rounded-circle" src="${user.profile_image || '/templates/images/placeholder.jpg'}" alt="${user.username}">
                </div>
                <div class="overflow-hidden">
                    <a class="h6 mb-0" href="#!">${user.username}</a>
                </div>
                <a class="btn btn-primary-soft rounded-circle icon-md ms-auto follow-btn" href="#" data-user-id="${user.id}"><i class="fa-solid fa-plus"> </i></a>
            `;
            friendRecommendations.appendChild(userElement);
        });
    }

    // 댓글 목록 조회 함수 추가
    async function fetchComments(postId) {
        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/comments/posts/${postId}/comments/`,
                { method: 'GET' }
            );

            if (response && response.ok) {
                const data = await response.json();
                return data;
            }
            return null;
        } catch (error) {
            console.error('댓글 조회 중 오류 발생:', error);
            return null;
        }
    }

    // 팔로우 기능
    async function followUser(userId) {
        try {
            const response = await authenticatedFetch(
                `http://127.0.0.1:8000/follow/follow/${userId}/`,
                { method: 'POST' }
            );

            return response && response.ok;
        } catch (error) {
            console.error('팔로우 중 오류 발생:', error);
            return false;
        }
    }

    // 좋아요 기능
    async function likePost(postId) {
        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/likes/posts/${postId}/like/`,
                { method: 'POST' }
            );

            if (response && response.ok) {
                // 응답이 숫자(좋아요 수)를 반환
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('좋아요 처리 중 오류 발생:', error);
            return null;
        }
    }

    // 이벤트 리스너 설정
    function addEventListeners() {
        // 좋아요 버튼 이벤트
        document.querySelectorAll('.like-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const postId = e.currentTarget.getAttribute('data-post-id');
                const likeCount = await likePost(postId);
                
                if (likeCount !== null) {
                    const likesCountElement = e.currentTarget.querySelector('.likes-count');
                    if (likesCountElement) {
                        likesCountElement.textContent = likeCount;
                    }
                    e.currentTarget.classList.toggle('active');
                }
            });
        });

        // 팔로우 버튼 이벤트
        document.querySelectorAll('.follow-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const userId = e.currentTarget.getAttribute('data-user-id');
                const success = await followUser(userId);
                
                if (success) {
                    const followBtn = e.currentTarget;
                    followBtn.innerHTML = '<i class="fa-solid fa-check"> </i>';
                    followBtn.classList.remove('btn-primary-soft');
                    followBtn.classList.add('btn-success');
                    followBtn.disabled = true;
                }
            });
        });

        // 포스트 상세 페이지로 이동 (포스트 내용 클릭 시)
        document.querySelectorAll('.post-detail-link').forEach(element => {
            element.addEventListener('click', (e) => {
                const postId = e.currentTarget.getAttribute('data-post-id');
                window.location.href = `/templates/post-detail.html?id=${postId}`;
            });
        });

        // 댓글 버튼 클릭 시 상세 페이지로 이동
        document.querySelectorAll('.comment-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const postId = e.currentTarget.getAttribute('data-post-id');
                window.location.href = `/templates/post-detail.html?id=${postId}#comments`;
            });
        });
    }

    // 이벤트 리스너
    document.querySelectorAll('.like-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const postId = e.currentTarget.getAttribute('data-post-id');
            const likesCount = await likePost(postId);
            
            if (likesCount !== null) {
                const likesCountElement = e.currentTarget.querySelector('.likes-count');
                if (likesCountElement) {
                    likesCountElement.textContent = likesCount;
                }
                e.currentTarget.classList.toggle('active');
            }
        });
    });


    // 초기 로드
    async function init() {
        // JWT 토큰이 없으면 로그인 페이지로 리다이렉트
        if (!getJWTToken()) {
            window.location.href = '/login.html';
            return;
        }

        const initialPosts = await fetchPosts(); // 모든 게시물 가져오기
        if (initialPosts && initialPosts.results) {
            displayPosts(initialPosts.results);
        }
    
        // 친구 추천 목록 불러오기
        allRecommendations = await fetchFriendRecommendations();
        if (allRecommendations && allRecommendations.length > 0) {
            displayFriendRecommendations(allRecommendations.slice(0, recommendationsPerPage));
            addEventListeners();
        } else {
            friendRecommendations.innerHTML = '<p>추천할 친구가 없습니다.</p>';
            loadMoreFriendsBtn.style.display = 'none';
        }
    }

    // 더 보기 버튼 이벤트
    loadMoreFriendsBtn.addEventListener('click', () => {
        recommendationPage++;
        const startIndex = (recommendationPage - 1) * recommendationsPerPage;
        const endIndex = startIndex + recommendationsPerPage;
        const moreRecommendations = allRecommendations.slice(startIndex, endIndex);
        
        if (moreRecommendations.length > 0) {
            displayFriendRecommendations([...friendRecommendations.querySelectorAll('.hstack'), ...moreRecommendations]);
            addEventListeners();
        }
        
        if (endIndex >= allRecommendations.length) {
            loadMoreFriendsBtn.style.display = 'none';
        }
    });

    // 스크롤 이벤트를 통한 무한 스크롤 구현
    window.addEventListener('scroll', async () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
            currentPage++;
            const morePosts = await fetchPosts(currentPage);
            if (morePosts && morePosts.results && morePosts.results.length > 0) {
                displayPosts(morePosts.results);
                addEventListeners();
            }
        }
    });

    init();
});
