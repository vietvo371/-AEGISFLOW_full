import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../theme';

interface VoteButtonsProps {
    reportId: number;
    initialUpvotes: number;
    initialDownvotes: number;
    userVoted: number | null; // 1: upvoted, -1: downvoted, null: not voted
    onVote: (type: 'upvote' | 'downvote') => Promise<void>;
    disabled?: boolean;
}

const VoteButtons: React.FC<VoteButtonsProps> = ({
    reportId,
    initialUpvotes,
    initialDownvotes,
    userVoted: initialUserVoted,
    onVote,
    disabled = false
}) => {
    const [upvotes, setUpvotes] = useState(initialUpvotes);
    const [downvotes, setDownvotes] = useState(initialDownvotes);
    const [userVoted, setUserVoted] = useState<number | null>(initialUserVoted);
    const [loading, setLoading] = useState(false);

    // Sync state with props when they change
    useEffect(() => {
        setUpvotes(initialUpvotes);
        setDownvotes(initialDownvotes);
        setUserVoted(initialUserVoted);
    }, [initialUpvotes, initialDownvotes, initialUserVoted]);

    const handleVote = async (type: 'upvote' | 'downvote') => {
        if (loading || disabled) return;

        const voteValue = type === 'upvote' ? 1 : -1;

        // Optimistic UI update
        const previousUpvotes = upvotes;
        const previousDownvotes = downvotes;
        const previousUserVoted = userVoted;

        try {
            // If user already voted the same way, remove vote
            if (userVoted === voteValue) {
                setUserVoted(null);
                if (type === 'upvote') {
                    setUpvotes(prev => prev - 1);
                } else {
                    setDownvotes(prev => prev - 1);
                }
            }
            // If user voted opposite way, switch vote
            else if (userVoted !== null && userVoted !== voteValue) {
                setUserVoted(voteValue);
                if (type === 'upvote') {
                    setUpvotes(prev => prev + 1);
                    setDownvotes(prev => prev - 1);
                } else {
                    setDownvotes(prev => prev + 1);
                    setUpvotes(prev => prev - 1);
                }
            }
            // If user hasn't voted, add new vote
            else {
                setUserVoted(voteValue);
                if (type === 'upvote') {
                    setUpvotes(prev => prev + 1);
                } else {
                    setDownvotes(prev => prev + 1);
                }
            }

            setLoading(true);
            await onVote(type);
        } catch (error) {
            // Revert on error
            setUpvotes(previousUpvotes);
            setDownvotes(previousDownvotes);
            setUserVoted(previousUserVoted);
            console.error('Vote error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Upvote Button */}
            <TouchableOpacity
                style={[
                    styles.voteButton,
                    userVoted === 1 && styles.upvoteActive,
                    disabled && styles.disabled
                ]}
                onPress={() => handleVote('upvote')}
                disabled={loading || disabled}
                activeOpacity={0.7}
            >
                {loading && userVoted === 1 ? (
                    <ActivityIndicator size="small" color={theme.colors.success} />
                ) : (
                    <>
                        <Icon
                            name={userVoted === 1 ? 'thumb-up' : 'thumb-up-outline'}
                            size={20}
                            color={userVoted === 1 ? theme.colors.white : theme.colors.success}
                        />
                        <Text style={[
                            styles.voteText,
                            userVoted === 1 && styles.voteTextActive
                        ]}>
                            {upvotes}
                        </Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Downvote Button */}
            <TouchableOpacity
                style={[
                    styles.voteButton,
                    userVoted === -1 && styles.downvoteActive,
                    disabled && styles.disabled
                ]}
                onPress={() => handleVote('downvote')}
                disabled={loading || disabled}
                activeOpacity={0.7}
            >
                {loading && userVoted === -1 ? (
                    <ActivityIndicator size="small" color={theme.colors.error} />
                ) : (
                    <>
                        <Icon
                            name={userVoted === -1 ? 'thumb-down' : 'thumb-down-outline'}
                            size={20}
                            color={userVoted === -1 ? theme.colors.white : theme.colors.error}
                        />
                        <Text style={[
                            styles.voteText,
                            userVoted === -1 && styles.voteTextActive
                        ]}>
                            {downvotes}
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    voteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: theme.colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    upvoteActive: {
        backgroundColor: theme.colors.success,
        borderColor: theme.colors.success,
    },
    downvoteActive: {
        backgroundColor: theme.colors.error,
        borderColor: theme.colors.error,
    },
    disabled: {
        opacity: 0.5,
    },
    voteText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: theme.colors.text,
    },
    voteTextActive: {
        color: theme.colors.white,
    },
});

export default VoteButtons;
